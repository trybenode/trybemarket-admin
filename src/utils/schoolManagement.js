import { 
  collection, 
  doc,
  getDoc,
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  limit,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

/**
 * Get all schools with their statistics (lightweight - only user count)
 */
export const getAllSchools = async () => {
  try {
    const schoolsRef = collection(db, 'schools');
    const schoolsSnapshot = await getDocs(schoolsRef);
    
    const schools = await Promise.all(
      schoolsSnapshot.docs.map(async (schoolDoc) => {
        const schoolData = schoolDoc.data();
        const schoolName = schoolData.name || 'N/A';
        
        // Get user count for this school by matching selectedUniversity with school name
        const usersQuery = query(
          collection(db, 'users'),
          where('selectedUniversity', '==', schoolName)
        );
        const usersCount = await getCountFromServer(usersQuery);
        
        return {
          id: schoolDoc.id,
          name: schoolName,
          location: schoolData.location || schoolData.address || 'N/A',
          email: schoolData.email || 'N/A',
          type: schoolData.type || 'N/A',
          status: schoolData.status || 'Active',
          users: usersCount.data().count,
          createdAt: schoolData.createdAt,
        };
      })
    );
    
    return schools;
  } catch (error) {
    console.error('Error getting schools:', error);
    throw error;
  }
};

/**
 * Get a single school by ID with detailed information
 */
export const getSchoolById = async (schoolId) => {
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    const schoolSnap = await getDoc(schoolRef);
    
    if (!schoolSnap.exists()) {
      throw new Error('School not found');
    }
    
    const schoolData = schoolSnap.data();
    const schoolName = schoolData.name || 'N/A';
    
    // Get users for this school by matching selectedUniversity with school name
    const usersQuery = query(
      collection(db, 'users'),
      where('selectedUniversity', '==', schoolName)
    );
    const usersCount = await getCountFromServer(usersQuery);
    
    // Get products count by schoolId field (no status filter to get all products)
    const productsQuery = query(
      collection(db, 'products'),
      where('schoolId', '==', schoolId)
    );
    const productsCount = await getCountFromServer(productsQuery);
    
    // Get services count by schoolId field (no status filter to get all services)
    const servicesQuery = query(
      collection(db, 'services'),
      where('schoolId', '==', schoolId)
    );
    const servicesCount = await getCountFromServer(servicesQuery);
    
    // Get users for this school
    const usersData = await getSchoolUsers(schoolId, 10);
    
    return {
      id: schoolSnap.id,
      name: schoolName,
      location: schoolData.location || schoolData.address || 'N/A',
      email: schoolData.email || 'N/A',
      type: schoolData.type || 'N/A',
      status: schoolData.status || 'Active',
      users: usersCount.data().count,
      activeProducts: productsCount.data().count,
      activeServices: servicesCount.data().count,
      dateJoined: schoolData.createdAt,
      usersData,
    };
  } catch (error) {
    console.error('Error getting school:', error);
    throw error;
  }
};

/**
 * Get recent listings (products and services) for a school
 */
export const getRecentListings = async (schoolId, schoolName, limitCount = 10) => {
  try {
    // Get recent products by matching university field with school name
    const productsQuery = query(
      collection(db, 'products'),
      where('university', '==', schoolName),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const productsSnapshot = await getDocs(productsQuery);
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || doc.data().name || 'N/A',
      type: 'Product',
      price: doc.data().price ? `₦${doc.data().price}` : 'N/A',
      status: doc.data().status || 'active',
      date: doc.data().createdAt,
    }));
    
    // Get recent services by matching university field with school name
    const servicesQuery = query(
      collection(db, 'services'),
      where('university', '==', schoolName),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const servicesSnapshot = await getDocs(servicesQuery);
    const services = servicesSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || doc.data().name || 'N/A',
      type: 'Service',
      price: doc.data().price ? `₦${doc.data().price}/hr` : 'N/A',
      status: doc.data().status || 'active',
      date: doc.data().createdAt,
    }));
    
    // Combine and sort by date
    const allListings = [...products, ...services];
    allListings.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });
    
    return allListings.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting recent listings:', error);
    return [];
  }
};

/**
 * Add a new school
 */
export const addSchool = async (schoolData) => {
  try {
    const schoolsRef = collection(db, 'schools');
    const newSchool = {
      name: schoolData.name,
      location: schoolData.location || schoolData.address || '',
      email: schoolData.email || '',
      type: schoolData.type || 'private',
      status: schoolData.status || 'Active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(schoolsRef, newSchool);
    return { id: docRef.id, ...newSchool };
  } catch (error) {
    console.error('Error adding school:', error);
    throw error;
  }
};

/**
 * Update an existing school
 */
export const updateSchool = async (schoolId, schoolData) => {
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    const updateData = {
      ...schoolData,
      updatedAt: Timestamp.now(),
    };
    
    await updateDoc(schoolRef, updateData);
    return { id: schoolId, ...updateData };
  } catch (error) {
    console.error('Error updating school:', error);
    throw error;
  }
};

/**
 * Delete a school
 */
export const deleteSchool = async (schoolId) => {
  try {
    // Get school data first to check for users
    const schoolRef = doc(db, 'schools', schoolId);
    const schoolSnap = await getDoc(schoolRef);
    
    if (!schoolSnap.exists()) {
      throw new Error('School not found');
    }
    
    const schoolName = schoolSnap.data().name;
    
    // Check if school has users (check by selectedUniversity)
    const usersQuery = query(
      collection(db, 'users'),
      where('selectedUniversity', '==', schoolName)
    );
    const usersCount = await getCountFromServer(usersQuery);
    
    if (usersCount.data().count > 0) {
      throw new Error('Cannot delete school with existing users. Please reassign or remove users first.');
    }
    
    await deleteDoc(schoolRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting school:', error);
    throw error;
  }
};

/**
 * Search schools by name (lightweight - only user count)
 */
export const searchSchools = async (searchTerm) => {
  try {
    const schoolsRef = collection(db, 'schools');
    const schoolsSnapshot = await getDocs(schoolsRef);
    
    const schools = await Promise.all(
      schoolsSnapshot.docs
        .filter(doc => {
          const name = doc.data().name || '';
          return name.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .map(async (schoolDoc) => {
          const schoolData = schoolDoc.data();
          const schoolName = schoolData.name || 'N/A';
          
          // Get user count by matching selectedUniversity
          const usersQuery = query(
            collection(db, 'users'),
            where('selectedUniversity', '==', schoolName)
          );
          const usersCount = await getCountFromServer(usersQuery);
          
          return {
            id: schoolDoc.id,
            name: schoolName,
            location: schoolData.location || schoolData.address || 'N/A',
            email: schoolData.email || 'N/A',
            type: schoolData.type || 'N/A',
            status: schoolData.status || 'Active',
            users: usersCount.data().count,
          };
        })
    );
    
    return schools;
  } catch (error) {
    console.error('Error searching schools:', error);
    throw error;
  }
};

/**
 * Get users for a specific school
 */
export const getSchoolUsers = async (schoolId, limitCount = 50) => {
  try {
    // First get the school to find its name
    const schoolRef = doc(db, 'schools', schoolId);
    const schoolSnap = await getDoc(schoolRef);
    
    if (!schoolSnap.exists()) {
      throw new Error('School not found');
    }
    
    const schoolName = schoolSnap.data().name;
    
    // Query users by selectedUniversity matching school name
    const usersQuery = query(
      collection(db, 'users'),
      where('selectedUniversity', '==', schoolName),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return users;
  } catch (error) {
    console.error('Error getting school users:', error);
    throw error;
  }
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    // Handle Firestore Timestamp
    if (date.toDate) {
      return date.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Handle string date
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Handle Date object
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};
