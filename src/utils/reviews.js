import { 
  collection, 
  doc,
  getDocs, 
  getDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  getCountFromServer,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

/**
 * Get all reviews from Firestore
 * @returns {Promise<Array>} Array of review objects
 */
export const getAllReviews = async () => {
  try {
    const reviewsCollection = collection(db, "reviews");
    const q = query(reviewsCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const reviews = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let createdAt = null;
      
      // Handle both Firestore Timestamp and string dates
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          createdAt = new Date(data.createdAt);
        } else if (data.createdAt.toDate) {
          createdAt = data.createdAt.toDate();
        }
      }
      
      reviews.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });
    
    return reviews;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

/**
 * Get reviews by rating
 * @param {number} rating - Rating to filter by (1-5)
 * @returns {Promise<Array>} Array of review objects
 */
export const getReviewsByRating = async (rating) => {
  try {
    const reviewsCollection = collection(db, "reviews");
    const q = query(
      reviewsCollection,
      where("rating", "==", rating),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const reviews = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let createdAt = null;
      
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          createdAt = new Date(data.createdAt);
        } else if (data.createdAt.toDate) {
          createdAt = data.createdAt.toDate();
        }
      }
      
      reviews.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });
    
    return reviews;
  } catch (error) {
    console.error(`Error fetching reviews with rating ${rating}:`, error);
    throw error;
  }
};

/**
 * Delete a review
 * @param {string} reviewId - Review ID to delete
 * @returns {Promise<void>}
 */
export const deleteReview = async (reviewId) => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    await deleteDoc(reviewRef);
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

/**
 * Get review statistics
 * @returns {Promise<Object>} Object containing review statistics
 */
export const getReviewStats = async () => {
  try {
    const reviewsCollection = collection(db, "reviews");
    
    const [
      totalSnapshot,
      rating5Snapshot,
      rating4Snapshot,
      rating3Snapshot,
      rating2Snapshot,
      rating1Snapshot,
    ] = await Promise.all([
      getCountFromServer(reviewsCollection),
      getCountFromServer(query(reviewsCollection, where("rating", "==", 5))),
      getCountFromServer(query(reviewsCollection, where("rating", "==", 4))),
      getCountFromServer(query(reviewsCollection, where("rating", "==", 3))),
      getCountFromServer(query(reviewsCollection, where("rating", "==", 2))),
      getCountFromServer(query(reviewsCollection, where("rating", "==", 1))),
    ]);

    const total = totalSnapshot.data().count;
    const rating5 = rating5Snapshot.data().count;
    const rating4 = rating4Snapshot.data().count;
    const rating3 = rating3Snapshot.data().count;
    const rating2 = rating2Snapshot.data().count;
    const rating1 = rating1Snapshot.data().count;

    // Calculate average rating
    const totalRatingSum = (5 * rating5) + (4 * rating4) + (3 * rating3) + (2 * rating2) + (1 * rating1);
    const averageRating = total > 0 ? (totalRatingSum / total).toFixed(1) : 0;

    return {
      total,
      rating5,
      rating4,
      rating3,
      rating2,
      rating1,
      averageRating: parseFloat(averageRating),
    };
  } catch (error) {
    console.error("Error fetching review stats:", error);
    throw error;
  }
};
