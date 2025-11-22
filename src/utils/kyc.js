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
import { db } from "@/lib/firebaseConfig";

/**
 * Get all KYC requests from Firestore
 * @returns {Promise<Array>} Array of KYC request objects
 */
export const getAllKYCRequests = async () => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(kycCollection, orderBy("submittedDate", "desc"));
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      kycRequests.push({
        id: doc.id,
        ...doc.data(),
        submittedDate: doc.data().submittedDate?.toDate?.() || new Date(),
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
 * @param {string} status - Status to filter by ('Pending', 'Approved', 'Rejected')
 * @returns {Promise<Array>} Array of filtered KYC request objects
 */
export const getKYCRequestsByStatus = async (status) => {
  try {
    const kycCollection = collection(db, "kycRequests");
    const q = query(
      kycCollection, 
      where("status", "==", status),
      orderBy("submittedDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      kycRequests.push({
        id: doc.id,
        ...doc.data(),
        submittedDate: doc.data().submittedDate?.toDate?.() || new Date(),
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
      return {
        id: docSnap.id,
        ...docSnap.data(),
        submittedDate: docSnap.data().submittedDate?.toDate?.() || new Date(),
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
      orderBy("submittedDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      kycRequests.push({
        id: doc.id,
        ...doc.data(),
        submittedDate: doc.data().submittedDate?.toDate?.() || new Date(),
      });
    });
    
    return kycRequests;
  } catch (error) {
    console.error("Error fetching user KYC requests:", error);
    throw error;
  }
};

/**
 * Update KYC request status (Approve or Reject)
 * @param {string} requestId - The ID of the KYC request
 * @param {string} newStatus - The new status ('Approved' or 'Rejected')
 * @param {string} adminId - The ID of the admin making the change
 * @param {string} reason - Optional reason for rejection
 * @returns {Promise<Object>} Updated KYC request object
 */
export const updateKYCStatus = async (requestId, newStatus, adminId, reason = null) => {
  try {
    const kycDoc = doc(db, "kycRequests", requestId);
    
    const updateData = {
      status: newStatus,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Add rejection reason if provided
    if (newStatus === "Rejected" && reason) {
      updateData.rejectionReason = reason;
    }
    
    await updateDoc(kycDoc, updateData);
    
    // Get the updated document
    const updatedDoc = await getDoc(kycDoc);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      submittedDate: updatedDoc.data().submittedDate?.toDate?.() || new Date(),
    };
  } catch (error) {
    console.error("Error updating KYC status:", error);
    throw error;
  }
};

/**
 * Approve KYC request
 * @param {string} requestId - The ID of the KYC request
 * @param {string} adminId - The ID of the admin approving the request
 * @returns {Promise<Object>} Updated KYC request object
 */
export const approveKYCRequest = async (requestId, adminId) => {
  try {
    return await updateKYCStatus(requestId, "Approved", adminId);
  } catch (error) {
    console.error("Error approving KYC request:", error);
    throw error;
  }
};

/**
 * Reject KYC request
 * @param {string} requestId - The ID of the KYC request
 * @param {string} adminId - The ID of the admin rejecting the request
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Updated KYC request object
 */
export const rejectKYCRequest = async (requestId, adminId, reason) => {
  try {
    return await updateKYCStatus(requestId, "Rejected", adminId, reason);
  } catch (error) {
    console.error("Error rejecting KYC request:", error);
    throw error;
  }
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
      userName: kycData.userName,
      email: kycData.email,
      phoneNumber: kycData.phoneNumber,
      schoolName: kycData.schoolName,
      schoolIdImage: kycData.schoolIdImage, // Cloudinary URL
      status: "Pending",
      submittedDate: serverTimestamp(),
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
      pending: allRequests.filter(req => req.status === "Pending").length,
      approved: allRequests.filter(req => req.status === "Approved").length,
      rejected: allRequests.filter(req => req.status === "Rejected").length,
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
      orderBy("submittedDate", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const kycRequests = [];
    querySnapshot.forEach((doc) => {
      kycRequests.push({
        id: doc.id,
        ...doc.data(),
        submittedDate: doc.data().submittedDate?.toDate?.() || new Date(),
      });
    });
    
    return kycRequests;
  } catch (error) {
    console.error("Error fetching recent KYC requests:", error);
    throw error;
  }
};

/**
 * Update KYC request school ID image
 * @param {string} requestId - The ID of the KYC request
 * @param {string} newImageUrl - New Cloudinary image URL
 * @returns {Promise<void>}
 */
export const updateSchoolIdImage = async (requestId, newImageUrl) => {
  try {
    const kycDoc = doc(db, "kycRequests", requestId);
    await updateDoc(kycDoc, {
      schoolIdImage: newImageUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating school ID image:", error);
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
    const q = query(kycCollection, where("status", "==", "Pending"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.size;
  } catch (error) {
    console.error("Error fetching pending KYC count:", error);
    throw error;
  }
};