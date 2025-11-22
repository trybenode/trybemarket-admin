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
 * Get all schools with their statistics
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
        
        // Get all users for this school to check their listings
        const usersSnapshot = await getDocs(usersQuery);
        const userIds = usersSnapshot.docs.map(doc => doc.id);
        
        let productsCount = 0;
        let servicesCount = 0;
        
        // Get products and services count for users of this school
        if (userIds.length > 0) {
          // Note: Firestore 'in' queries support up to 30 items
          // For larger user lists, we'll need to batch the queries
          const batchSize = 30;
          for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            
            // Get products count
            const productsQuery = query(
              collection(db, 'products'),
              where('userId', 'in', batch),
              where('status', '==', 'active')
            );
            const productsSnapshot = await getCountFromServer(productsQuery);
            productsCount += productsSnapshot.data().count;
            
            // Get services count
            const servicesQuery = query(
              collection(db, 'services'),
              where('userId', 'in', batch),
              where('status', '==', 'active')
            );
            const servicesSnapshot = await getCountFromServer(servicesQuery);
            servicesCount += servicesSnapshot.data().count;
          }
        }
        
        return {
          id: schoolDoc.id,
          name: schoolName,
          location: schoolData.location || schoolData.address || 'N/A',
          email: schoolData.email || 'N/A',
          type: schoolData.type || 'N/A',
          status: schoolData.status || 'Active',
          users: usersCount.data().count,
          products: productsCount,
          services: servicesCount,
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
    const usersSnapshot = await getDocs(usersQuery);
    const usersCount = usersSnapshot.docs.length;
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    let productsCount = 0;
    let servicesCount = 0;
    
    // Get products and services count for users of this school
    if (userIds.length > 0) {
      const batchSize = 30;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        // Get products count
        const productsQuery = query(
          collection(db, 'products'),
          where('userId', 'in', batch),
          where('status', '==', 'active')
        );
        const productsSnapshot = await getCountFromServer(productsQuery);
        productsCount += productsSnapshot.data().count;
        
        // Get services count
        const servicesQuery = query(
          collection(db, 'services'),
          where('userId', 'in', batch),
          where('status', '==', 'active')
        );
        const servicesSnapshot = await getCountFromServer(servicesQuery);
        servicesCount += servicesSnapshot.data().count;
      }
    }
    
    // Get recent listings (products and services)
    const recentListings = await getRecentListings(schoolId, schoolName, userIds, 10);
    
    return {
      id: schoolSnap.id,
      name: schoolName,
      location: schoolData.location || schoolData.address || 'N/A',
      email: schoolData.email || 'N/A',
      type: schoolData.type || 'N/A',
      status: schoolData.status || 'Active',
      users: usersCount,
      activeProducts: productsCount,
      activeServices: servicesCount,
      dateJoined: schoolData.createdAt,
      recentListings,
    };
  } catch (error) {
    console.error('Error getting school:', error);
    throw error;
  }
};

/**
 * Get recent listings (products and services) for a school
 */
export const getRecentListings = async (schoolId, schoolName, userIds, limitCount = 10) => {
  try {
    const allListings = [];
    
    if (userIds.length === 0) {
      return [];
    }
    
    // Batch userIds for Firestore 'in' queries (max 30 items)
    const batchSize = 30;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Get recent products
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', 'in', batch),
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
      
      // Get recent services
      const servicesQuery = query(
        collection(db, 'services'),
        where('userId', 'in', batch),
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
      
      allListings.push(...products, ...services);
    }
    
    // Sort by date and limit
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
 * Search schools by name
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
          const usersSnapshot = await getDocs(usersQuery);
          const usersCount = usersSnapshot.docs.length;
          const userIds = usersSnapshot.docs.map(doc => doc.id);
          
          let productsCount = 0;
          let servicesCount = 0;
          
          if (userIds.length > 0) {
            const batchSize = 30;
            for (let i = 0; i < userIds.length; i += batchSize) {
              const batch = userIds.slice(i, i + batchSize);
              
              const productsQuery = query(
                collection(db, 'products'),
                where('userId', 'in', batch),
                where('status', '==', 'active')
              );
              const productsSnapshot = await getCountFromServer(productsQuery);
              productsCount += productsSnapshot.data().count;
              
              const servicesQuery = query(
                collection(db, 'services'),
                where('userId', 'in', batch),
                where('status', '==', 'active')
              );
              const servicesSnapshot = await getCountFromServer(servicesQuery);
              servicesCount += servicesSnapshot.data().count;
            }
          }
          
          return {
            id: schoolDoc.id,
            name: schoolName,
            location: schoolData.location || schoolData.address || 'N/A',
            email: schoolData.email || 'N/A',
            type: schoolData.type || 'N/A',
            status: schoolData.status || 'Active',
            users: usersCount,
            products: productsCount,
            services: servicesCount,
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
