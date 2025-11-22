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
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

/**
 * Get all subscription plans
 * @returns {Promise<Array>} Array of plan objects
 */
export const getAllPlans = async () => {
  try {
    const plansCollection = collection(db, "subscriptionPlans");
    const querySnapshot = await getDocs(plansCollection);
    
    const plans = [];
    querySnapshot.forEach((doc) => {
      plans.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
    
    // Sort by category and type
    return plans.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    throw error;
  }
};

/**
 * Get plans by category
 * @param {string} category - Category to filter by ('product', 'service', 'bundle', 'boost', 'discount')
 * @returns {Promise<Array>} Array of filtered plan objects
 */
export const getPlansByCategory = async (category) => {
  try {
    const plansCollection = collection(db, "subscriptionPlans");
    const q = query(plansCollection, where("category", "==", category));
    const querySnapshot = await getDocs(q);
    
    const plans = [];
    querySnapshot.forEach((doc) => {
      plans.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
    
    return plans;
  } catch (error) {
    console.error(`Error fetching ${category} plans:`, error);
    throw error;
  }
};

/**
 * Get a single plan by ID
 * @param {string} planId - The ID of the plan
 * @returns {Promise<Object>} Plan object
 */
export const getPlanById = async (planId) => {
  try {
    const planDoc = doc(db, "subscriptionPlans", planId);
    const docSnap = await getDoc(planDoc);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
      };
    } else {
      throw new Error("Plan not found");
    }
  } catch (error) {
    console.error("Error fetching plan:", error);
    throw error;
  }
};

/**
 * Create a new plan
 * @param {Object} planData - Plan data
 * @returns {Promise<string>} ID of the created plan
 */
export const createPlan = async (planData) => {
  try {
    const plansCollection = collection(db, "subscriptionPlans");
    const newPlanDoc = doc(plansCollection);
    
    const planToCreate = {
      ...planData,
      active: planData.active !== undefined ? planData.active : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(newPlanDoc, planToCreate);
    return newPlanDoc.id;
  } catch (error) {
    console.error("Error creating plan:", error);
    throw error;
  }
};

/**
 * Update an existing plan
 * @param {string} planId - The ID of the plan to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updatePlan = async (planId, updates) => {
  try {
    const planDoc = doc(db, "subscriptionPlans", planId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(planDoc, updateData);
  } catch (error) {
    console.error("Error updating plan:", error);
    throw error;
  }
};

/**
 * Delete a plan
 * @param {string} planId - The ID of the plan to delete
 * @returns {Promise<void>}
 */
export const deletePlan = async (planId) => {
  try {
    const planDoc = doc(db, "subscriptionPlans", planId);
    await deleteDoc(planDoc);
  } catch (error) {
    console.error("Error deleting plan:", error);
    throw error;
  }
};

/**
 * Toggle plan active status
 * @param {string} planId - The ID of the plan
 * @param {boolean} active - New active status
 * @returns {Promise<void>}
 */
export const togglePlanStatus = async (planId, active) => {
  try {
    const planDoc = doc(db, "subscriptionPlans", planId);
    await updateDoc(planDoc, {
      active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error toggling plan status:", error);
    throw error;
  }
};

/**
 * Get plan statistics
 * @returns {Promise<Object>} Object containing plan statistics
 */
export const getPlanStats = async () => {
  try {
    const allPlans = await getAllPlans();
    
    const stats = {
      total: allPlans.length,
      active: allPlans.filter(plan => plan.active).length,
      inactive: allPlans.filter(plan => !plan.active).length,
      byCategory: {
        product: allPlans.filter(p => p.category === 'product').length,
        service: allPlans.filter(p => p.category === 'service').length,
        bundle: allPlans.filter(p => p.category === 'bundle').length,
        boost: allPlans.filter(p => p.category === 'boost').length,
        discount: allPlans.filter(p => p.category === 'discount').length,
      },
    };
    
    return stats;
  } catch (error) {
    console.error("Error fetching plan stats:", error);
    throw error;
  }
};
