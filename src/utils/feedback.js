import { 
  collection, 
  doc,
  getDoc,
  getDocs, 
  query, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

/**
 * Get all feedback with user information
 */
export const getAllFeedback = async () => {
  try {
    const feedbackRef = collection(db, 'feedback');
    const feedbackQuery = query(feedbackRef, orderBy('createdAt', 'desc'));
    const feedbackSnapshot = await getDocs(feedbackQuery);
    
    const feedbackList = await Promise.all(
      feedbackSnapshot.docs.map(async (feedbackDoc) => {
        const feedbackData = feedbackDoc.data();
        
        // Get user information
        let userData = null;
        if (feedbackData.userId) {
          try {
            const userRef = doc(db, 'users', feedbackData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              userData = userSnap.data();
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }
        }
        
        return {
          id: feedbackDoc.id,
          title: feedbackData.title || 'N/A',
          description: feedbackData.description || 'N/A',
          userId: feedbackData.userId || 'N/A',
          userName: userData?.fullName || userData?.displayName || feedbackData.userName || 'Anonymous',
          userEmail: userData?.email || feedbackData.userEmail || 'N/A',
          userProfilePicture: userData?.profilePicture || null,
          createdAt: feedbackData.createdAt,
        };
      })
    );
    
    return feedbackList;
  } catch (error) {
    console.error('Error fetching feedback:', error);
    throw error;
  }
};

/**
 * Get single feedback by ID with full details
 */
export const getFeedbackById = async (feedbackId) => {
  try {
    const feedbackRef = doc(db, 'feedback', feedbackId);
    const feedbackSnap = await getDoc(feedbackRef);
    
    if (!feedbackSnap.exists()) {
      throw new Error('Feedback not found');
    }
    
    const feedbackData = feedbackSnap.data();
    
    // Get user information
    let userData = null;
    if (feedbackData.userId) {
      try {
        const userRef = doc(db, 'users', feedbackData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userData = userSnap.data();
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }
    
    return {
      id: feedbackSnap.id,
      title: feedbackData.title || 'N/A',
      description: feedbackData.description || 'N/A',
      userId: feedbackData.userId || 'N/A',
      userName: userData?.fullName || userData?.displayName || feedbackData.userName || 'Anonymous',
      userEmail: userData?.email || feedbackData.userEmail || 'N/A',
      userProfilePicture: userData?.profilePicture || null,
      userPhone: userData?.phoneNumber || 'N/A',
      userSchool: userData?.selectedUniversity || 'N/A',
      createdAt: feedbackData.createdAt,
    };
  } catch (error) {
    console.error('Error fetching feedback:', error);
    throw error;
  }
};

/**
 * Format date helper
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp instanceof Timestamp 
      ? timestamp.toDate() 
      : new Date(timestamp);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};
