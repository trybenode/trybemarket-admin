import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  getCountFromServer
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

/**
 * Get total count of users
 * @returns {Promise<number>} Total number of users
 */
export const getTotalUsers = async () => {
  try {
    const usersCollection = collection(db, "users");
    const snapshot = await getCountFromServer(usersCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching total users:", error);
    throw error;
  }
};

/**
 * Get total count of schools
 * @returns {Promise<number>} Total number of schools
 */
export const getTotalSchools = async () => {
  try {
    const schoolsCollection = collection(db, "schools");
    const snapshot = await getCountFromServer(schoolsCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching total schools:", error);
    throw error;
  }
};

/**
 * Get total count of products
 * @returns {Promise<number>} Total number of products
 */
export const getTotalProducts = async () => {
  try {
    const productsCollection = collection(db, "products");
    const snapshot = await getCountFromServer(productsCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching total products:", error);
    throw error;
  }
};

/**
 * Get total count of services
 * @returns {Promise<number>} Total number of services
 */
export const getTotalServices = async () => {
  try {
    const servicesCollection = collection(db, "services");
    const snapshot = await getCountFromServer(servicesCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching total services:", error);
    throw error;
  }
};

/**
 * Get count of active monthly subscriptions
 * @returns {Promise<number>} Number of active monthly subscriptions
 */
export const getActiveMonthlySubscriptions = async () => {
  try {
    const subscriptionsCollection = collection(db, "subscriptions");
    const q = query(
      subscriptionsCollection,
      where("status", "==", "active"),
      where("interval", "==", "month")
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching active monthly subscriptions:", error);
    throw error;
  }
};

/**
 * Get all active subscriptions (monthly and yearly)
 * @returns {Promise<number>} Number of all active subscriptions
 */
export const getTotalActiveSubscriptions = async () => {
  try {
    const subscriptionsCollection = collection(db, "subscriptions");
    const q = query(subscriptionsCollection, where("status", "==", "active"));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching total active subscriptions:", error);
    throw error;
  }
};

/**
 * Calculate total revenue from orders
 * @returns {Promise<number>} Total revenue generated
 */
export const getTotalRevenue = async () => {
  try {
    const ordersCollection = collection(db, "orders");
    const q = query(
      ordersCollection,
      where("status", "in", ["completed", "delivered", "paid"])
    );
    const querySnapshot = await getDocs(q);
    
    let totalRevenue = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Assuming orders have a 'total' or 'amount' field
      totalRevenue += data.total || data.amount || 0;
    });
    
    return totalRevenue;
  } catch (error) {
    console.error("Error calculating total revenue:", error);
    throw error;
  }
};

/**
 * Calculate monthly revenue (current month)
 * @returns {Promise<number>} Revenue for current month
 */
export const getMonthlyRevenue = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const ordersCollection = collection(db, "orders");
    const q = query(
      ordersCollection,
      where("status", "in", ["completed", "delivered", "paid"]),
      where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
      where("createdAt", "<=", Timestamp.fromDate(endOfMonth))
    );
    const querySnapshot = await getDocs(q);
    
    let monthlyRevenue = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      monthlyRevenue += data.total || data.amount || 0;
    });
    
    return monthlyRevenue;
  } catch (error) {
    console.error("Error calculating monthly revenue:", error);
    throw error;
  }
};

/**
 * Get subscription revenue (recurring)
 * @returns {Promise<number>} Total monthly recurring revenue from active subscriptions
 */
export const getSubscriptionRevenue = async () => {
  try {
    const subscriptionsCollection = collection(db, "subscriptions");
    const q = query(subscriptionsCollection, where("status", "==", "active"));
    const querySnapshot = await getDocs(q);
    
    let totalMRR = 0; // Monthly Recurring Revenue
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const amount = data.amount || data.price || 0;
      
      // Convert to monthly revenue
      if (data.interval === "month") {
        totalMRR += amount;
      } else if (data.interval === "year") {
        totalMRR += amount / 12; // Convert yearly to monthly
      }
    });
    
    return totalMRR;
  } catch (error) {
    console.error("Error calculating subscription revenue:", error);
    throw error;
  }
};

/**
 * Get recent users (last N users)
 * @param {number} limitCount - Number of recent users to fetch
 * @returns {Promise<Array>} Array of recent user objects
 */
export const getRecentUsers = async (limitCount = 10) => {
  try {
    const usersCollection = collection(db, "users");
    const q = query(
      usersCollection,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const users = [];
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
      
      users.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });
    
    return users;
  } catch (error) {
    console.error("Error fetching recent users:", error);
    throw error;
  }
};

/**
 * Get recent orders (last N orders)
 * @param {number} limitCount - Number of recent orders to fetch
 * @returns {Promise<Array>} Array of recent order objects
 */
export const getRecentOrders = async (limitCount = 10) => {
  try {
    const ordersCollection = collection(db, "orders");
    const q = query(
      ordersCollection,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
    
    return orders;
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    throw error;
  }
};

/**
 * Get orders by status
 * @param {string} status - Order status to filter by
 * @returns {Promise<number>} Count of orders with specified status
 */
export const getOrdersByStatus = async (status) => {
  try {
    const ordersCollection = collection(db, "orders");
    const q = query(ordersCollection, where("status", "==", status));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error fetching orders with status ${status}:`, error);
    throw error;
  }
};

/**
 * Get comprehensive dashboard statistics
 * @returns {Promise<Object>} Object containing all dashboard stats
 */
export const getDashboardStats = async () => {
  try {
    const [
      totalUsers,
      totalSchools,
      totalProducts,
      totalServices,
      activeSubscriptions,
      monthlySubscriptions,
    ] = await Promise.all([
      getTotalUsers(),
      getTotalSchools(),
      getTotalProducts(),
      getTotalServices(),
      getTotalActiveSubscriptions(),
      getActiveMonthlySubscriptions(),
    ]);

    return {
      users: {
        total: totalUsers,
      },
      schools: {
        total: totalSchools,
      },
      products: {
        total: totalProducts,
      },
      services: {
        total: totalServices,
      },
      subscriptions: {
        total: activeSubscriptions,
        monthly: monthlySubscriptions,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};

/**
 * Get new users in a specific time period
 * @param {number} days - Number of days to look back
 * @returns {Promise<number>} Number of new users in the period
 */
export const getNewUsers = async (days = 30) => {
  try {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const usersCollection = collection(db, "users");
    const q = query(
      usersCollection,
      where("createdAt", ">=", Timestamp.fromDate(startDate))
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching new users:", error);
    throw error;
  }
};

/**
 * Get revenue growth data for charts
 * @param {number} months - Number of months to get data for
 * @returns {Promise<Array>} Array of monthly revenue data
 */
export const getRevenueGrowthData = async (months = 6) => {
  try {
    const revenueData = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
      
      const ordersCollection = collection(db, "orders");
      const q = query(
        ordersCollection,
        where("status", "in", ["completed", "delivered", "paid"]),
        where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
        where("createdAt", "<=", Timestamp.fromDate(endOfMonth))
      );
      const querySnapshot = await getDocs(q);
      
      let monthRevenue = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        monthRevenue += data.total || data.amount || 0;
      });
      
      revenueData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
      });
    }
    
    return revenueData;
  } catch (error) {
    console.error("Error fetching revenue growth data:", error);
    throw error;
  }
};

/**
 * Get top performing products
 * @param {number} limitCount - Number of top products to fetch
 * @returns {Promise<Array>} Array of top products with sales count
 */
export const getTopProducts = async (limitCount = 5) => {
  try {
    const productsCollection = collection(db, "products");
    const q = query(
      productsCollection,
      orderBy("salesCount", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching top products:", error);
    throw error;
  }
};

/**
 * Get top performing services
 * @param {number} limitCount - Number of top services to fetch
 * @returns {Promise<Array>} Array of top services with booking count
 */
export const getTopServices = async (limitCount = 5) => {
  try {
    const servicesCollection = collection(db, "services");
    const q = query(
      servicesCollection,
      orderBy("bookingCount", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const services = [];
    querySnapshot.forEach((doc) => {
      services.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return services;
  } catch (error) {
    console.error("Error fetching top services:", error);
    throw error;
  }
};

/**
 * Get recent products (last N products)
 * @param {number} limitCount - Number of recent products to fetch
 * @returns {Promise<Array>} Array of recent product objects
 */
export const getRecentProducts = async (limitCount = 10) => {
  try {
    const productsCollection = collection(db, "products");
    const q = query(
      productsCollection,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const products = [];
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
      
      products.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching recent products:", error);
    throw error;
  }
};

/**
 * Get recent services (last N services)
 * @param {number} limitCount - Number of recent services to fetch
 * @returns {Promise<Array>} Array of recent service objects
 */
export const getRecentServices = async (limitCount = 10) => {
  try {
    const servicesCollection = collection(db, "services");
    const q = query(
      servicesCollection,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const services = [];
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
      
      services.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });
    
    return services;
  } catch (error) {
    console.error("Error fetching recent services:", error);
    throw error;
  }
};

/**
 * Get recent activity (users, products, services combined)
 * @param {number} limitCount - Number of recent activities to fetch per type
 * @returns {Promise<Array>} Array of recent activity objects sorted by date
 */
export const getRecentActivity = async (limitCount = 5) => {
  try {
    const [users, products, services] = await Promise.all([
      getRecentUsers(limitCount),
      getRecentProducts(limitCount),
      getRecentServices(limitCount),
    ]);

    // Combine and format activities
    const activities = [
      ...users
        .filter(user => user.createdAt) // Only include users with valid createdAt
        .map(user => ({
          type: 'user',
          action: 'created account',
          name: user.fullName || user.displayName || user.email || 'Unknown User',
          timestamp: user.createdAt,
          id: user.id,
        })),
      ...products
        .filter(product => product.createdAt) // Only include products with valid createdAt
        .map(product => ({
          type: 'product',
          action: 'posted product',
          name: product.name || product.title || 'Unnamed Product',
          timestamp: product.createdAt,
          id: product.id,
        })),
      ...services
        .filter(service => service.createdAt) // Only include services with valid createdAt
        .map(service => ({
          type: 'service',
          action: 'posted service',
          name: service.name || service.title || 'Unnamed Service',
          timestamp: service.createdAt,
          id: service.id,
        })),
    ];

    // Sort by timestamp descending and limit
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limitCount * 2);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    throw error;
  }
};

/**
 * Get order statistics
 * @returns {Promise<Object>} Object containing order statistics by status
 */
export const getOrderStats = async () => {
  try {
    const [pending, processing, completed, cancelled] = await Promise.all([
      getOrdersByStatus("pending"),
      getOrdersByStatus("processing"),
      getOrdersByStatus("completed"),
      getOrdersByStatus("cancelled"),
    ]);

    const total = pending + processing + completed + cancelled;

    return {
      total,
      pending,
      processing,
      completed,
      cancelled,
    };
  } catch (error) {
    console.error("Error fetching order stats:", error);
    throw error;
  }
};
