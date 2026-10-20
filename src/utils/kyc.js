import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "@/lib/firebaseConfig";

/**
 * Get all KYC requests from Firestore
 * @returns {Promise<Array>} Array of KYC request objects
 */
export const getAllKYCRequests = async () => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(kycCollection, orderBy("submittedAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      kycRequests.push({
        id: doc.id,
        ...data,
        submittedDate: data.submittedAt?.toDate?.() || new Date(),
      });
    });
    
    return kycRequests;
  } catch (error) {
    console.error("Error fetching KYC requests:", error);
    throw error;
  }
};

/**
 * Get KYC requests filtered by status
 * @param {string} status - Status to filter by ('pending', 'verified', 'rejected')
 * @returns {Promise<Array>} Array of filtered KYC request objects
 */
export const getKYCRequestsByStatus = async (status) => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(
      kycCollection, 
      where("status", "==", status),
      orderBy("submittedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      kycRequests.push({
        id: doc.id,
        ...data,
        submittedDate: data.submittedAt?.toDate?.() || new Date(),
      });
    });
    
    return kycRequests;
  } catch (error) {
    console.error(`Error fetching ${status} KYC requests:`, error);
    throw error;
  }
};

/**
 * Get a single KYC request by ID
 * @param {string} requestId - The ID of the KYC request
 * @returns {Promise<Object>} KYC request object
 */
export const getKYCRequestById = async (requestId) => {
  try {
    const kycDoc = doc(db, "kycRequests", requestId);
    const docSnap = await getDoc(kycDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        submittedDate: data.submittedAt?.toDate?.() || new Date(),
      };
    } else {
      throw new Error("KYC request not found");
    }
  } catch (error) {
    console.error("Error fetching KYC request:", error);
    throw error;
  }
};

/**
 * Get KYC requests by user ID
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of KYC request objects for the user
 */
export const getKYCRequestsByUserId = async (userId) => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(
      kycCollection, 
      where("userId", "==", userId),
      orderBy("submittedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      kycRequests.push({
        id: doc.id,
        ...data,
        submittedDate: data.submittedAt?.toDate?.() || new Date(),
      });
    });
    
    return kycRequests;
  } catch (error) {
    console.error("Error fetching user KYC requests:", error);
    throw error;
  }
};

/**
 * Sends a manual KYC decision to the web app's server
 * (/api/kyc/decision -> web app /api/admin/kyc/decision), which runs the real
 * verification transaction: only its server can set isVerified / kycLevel,
 * award the KYC credit and badge, enforce one-number-one-account, and count
 * (or reverse) a CRSA referral. Decisions can legitimately fail — e.g. the
 * number belongs to another account — so the server's message is thrown
 * as-is, with its details on `error.data` (e.g. `conflict`, `needsOverride`).
 *
 * @param {object} payload - { userId?, decision, reason?, overrideEligibility?, takeOverClaim?, claimKey? }
 */
async function submitKYCDecision(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");

  const idToken = await user.getIdToken();
  const response = await fetch("/api/kyc/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : data.error?.message;
    const error = new Error(message || `Request failed (${response.status})`);
    error.data = data;
    throw error;
  }
  return data;
}

/**
 * Approve a KYC request. ID-card requests become FULL verification; fresher
 * requests (portal screenshot / library card) become PROVISIONAL — the web
 * app decides from the request's track.
 * @param {string} requestId - The KYC request id (same as the user's uid)
 * @param {{ overrideEligibility?: boolean, takeOverClaim?: boolean, reason?: string }} [options]
 *   overrideEligibility: approve a request marked not eligible;
 *   takeOverClaim: move a number claim held by another account to this student (reason required).
 * @returns {Promise<Object>} { status, level, referralCounted, emailSent, alreadyVerified? }
 */
export const approveKYCRequest = async (requestId, options = {}) => {
  return submitKYCDecision({ userId: requestId, decision: "approve", ...options });
};

/**
 * Reject a pending KYC request. The reason is emailed to the student.
 * @returns {Promise<Object>} { status, emailSent }
 */
export const rejectKYCRequest = async (requestId, reason) => {
  return submitKYCDecision({ userId: requestId, decision: "reject", reason });
};

/**
 * Revoke a provisional or verified student's KYC. Undoes what the approval
 * granted (badge, CRSA count), holds their listings and pauses their plans.
 * Credit is not clawed back — `creditNote` says so when there was some.
 * @returns {Promise<Object>} { status, referralReversed, creditNote, emailSent }
 */
export const revokeKYC = async (requestId, reason) => {
  return submitKYCDecision({ userId: requestId, decision: "revoke", reason });
};

/**
 * Free a number claim (e.g. an impostor's) so the real student can use it.
 * Logged with the reason.
 * @param {string} claimKey - e.g. "temp:2601164", "library:21246", "lcuug2512345"
 */
export const releaseKYCClaim = async (claimKey, reason) => {
  return submitKYCDecision({ decision: "releaseClaim", claimKey, reason });
};

/**
 * Create a new KYC request (typically called from user side)
 * @param {Object} kycData - KYC request data
 * @returns {Promise<string>} ID of the created KYC request
 */
export const createKYCRequest = async (kycData) => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const newKYCDoc = doc(kycCollection);
    
    const kycRequestData = {
      userId: kycData.userId,
      fullName: kycData.fullName,
      matricNumber: kycData.matricNumber,
      frontID: kycData.frontID, // Cloudinary URL for front of ID
      backID: kycData.backID,   // Cloudinary URL for back of ID
      status: "pending",
      notificationSent: false,
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(newKYCDoc, kycRequestData);
    return newKYCDoc.id;
  } catch (error) {
    console.error("Error creating KYC request:", error);
    throw error;
  }
};

/**
 * Delete a KYC request
 * @param {string} requestId - The ID of the KYC request to delete
 * @returns {Promise<void>}
 */
export const deleteKYCRequest = async (requestId) => {
  try {
    const kycDoc = doc(db, "kycRequests", requestId);
    await deleteDoc(kycDoc);
  } catch (error) {
    console.error("Error deleting KYC request:", error);
    throw error;
  }
};

/**
 * Get KYC statistics
 * @returns {Promise<Object>} Object containing KYC statistics
 */
export const getKYCStats = async () => {
  try {
    const allRequests = await getAllKYCRequests();
    
    const stats = {
      total: allRequests.length,
      pending: allRequests.filter(req => req.status === "pending").length,
      verified: allRequests.filter(req => req.status === "verified").length,
      provisional: allRequests.filter(req => req.status === "provisional").length,
      rejected: allRequests.filter(req => req.status === "rejected").length,
    };
    
    return stats;
  } catch (error) {
    console.error("Error fetching KYC stats:", error);
    throw error;
  }
};

/**
 * Get recent KYC requests (last N requests)
 * @param {number} limitCount - Number of recent requests to fetch
 * @returns {Promise<Array>} Array of recent KYC request objects
 */
export const getRecentKYCRequests = async (limitCount = 10) => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(
      kycCollection, 
      orderBy("submittedAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      kycRequests.push({
        id: doc.id,
        ...data,
        submittedDate: data.submittedAt?.toDate?.() || new Date(),
      });
    });
    
    return kycRequests;
  } catch (error) {
    console.error("Error fetching recent KYC requests:", error);
    throw error;
  }
};

/**
 * Update KYC request ID images (front and/or back)
 * @param {string} requestId - The ID of the KYC request
 * @param {Object} imageUrls - Object containing frontID and/or backID URLs
 * @returns {Promise<void>}
 */
export const updateIDImages = async (requestId, imageUrls) => {
  try {
    const kycDoc = doc(db, "kycRequests", requestId);
    const updateData = {
      updatedAt: serverTimestamp(),
    };
    
    if (imageUrls.frontID) {
      updateData.frontID = imageUrls.frontID;
    }
    if (imageUrls.backID) {
      updateData.backID = imageUrls.backID;
    }
    
    await updateDoc(kycDoc, updateData);
  } catch (error) {
    console.error("Error updating ID images:", error);
    throw error;
  }
};

/**
 * Get pending KYC requests count
 * @returns {Promise<number>} Count of pending requests
 */
export const getPendingKYCCount = async () => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(kycCollection, where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.size;
  } catch (error) {
    console.error("Error fetching pending KYC count:", error);
    throw error;
  }
};