// seedSubscriptions.js
import admin from "firebase-admin";
import fs from "fs";

// Load service account
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccount.json", "utf8")
);

// Fix the private key formatting - replace escaped newlines with actual newlines
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const timestamp = admin.firestore.FieldValue.serverTimestamp();

// -------------------------------
// SUBSCRIPTION PLANS
// -------------------------------
const plans = {
  product_free: {
    name: "Freemium",
    category: "product",
    type: "free",
    price: 0,
    features: [
      "Post up to 3 products",
      "Messaging with buyers",
      "Public shop profile",
      "Profile view count",
      "Access to all basic platform features",
    ],
    limits: { maxProducts: 3, vipTags: 0 },
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: false, searchBoost: false },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  product_premium: {
    name: "Premium",
    category: "product",
    type: "premium",
    price: 1200,
    features: [
      "Unlimited product listings",
      "Shareable shop link",
      "Basic shop analytics",
      "Premium seller badge",
      "2 VIP-tagged products",
      "Access to TrybeFair",
    ],
    limits: { maxProducts: 9999, vipTags: 2 },
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: false, searchBoost: true },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  product_vip: {
    name: "VIP",
    category: "product",
    type: "vip",
    price: 1700,
    features: [
      "Everything in Premium",
      "5 VIP-tagged products",
      "Featured product placements",
      "Priority search ranking",
    ],
    limits: { maxProducts: 9999, vipTags: 5 },
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: true, searchBoost: true },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  product_maintenance: {
    name: "Maintenance",
    category: "product",
    type: "maintenance",
    price: 700,
    features: ["Keeps products active", "No VIP or analytics perks"],
    limits: { maxProducts: 9999, vipTags: 0 },
    eligibility: { requiresPaidMonths: 3 },
    visibility: { featured: false },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  service_free: {
    name: "Freemium",
    category: "service",
    type: "free",
    price: 0,
    features: [
      "1 service listing",
      "Messaging",
      "Public shop profile",
      "Profile view count",
      "All basic features",
    ],
    limits: { maxServices: 1 },
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: false },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  service_premium: {
    name: "Premium",
    category: "service",
    type: "premium",
    price: 1400,
    features: [
      "2 service listings",
      "Shareable shop link",
      "Premium service provider badge",
      "Shop analytics",
      "Service Boost",
      "TrybeFair access",
    ],
    limits: { maxServices: 2 },
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: false, searchBoost: true },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  service_vip: {
    name: "VIP",
    category: "service",
    type: "vip",
    price: 2000,
    features: [
      "Up to 5 services",
      "VIP badge",
      "1 VIP-tagged service",
      "Featured service placement",
    ],
    limits: { maxServices: 5, vipTags: 1 },
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: true, searchBoost: true },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  service_maintenance: {
    name: "Maintenance",
    category: "service",
    type: "maintenance",
    price: 700,
    features: ["Keeps services active", "No premium perks"],
    limits: { maxServices: 5 },
    eligibility: { requiresPaidMonths: 3 },
    visibility: { featured: false },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  bundle_premium: {
    name: "Premium Bundle",
    category: "bundle",
    type: "bundle",
    price: 2500,
    features: ["Premium Products plan", "Premium Services plan"],
    eligibility: { requiresPaidMonths: 0 },
    visibility: { featured: true },
    cycle: "monthly",
    active: true,
    createdAt: timestamp,
  },

  boost_7days: {
    name: "7-Day Boost",
    category: "boost",
    type: "boost",
    price: 300,
    features: ["Homepage spotlight", "Top search priority"],
    limits: { durationDays: 7 },
    active: true,
    createdAt: timestamp,
  },

  discounts_yearly: {
    name: "Yearly Subscription Discount",
    category: "discount",
    type: "yearly",
    price: 10000,
    cycle: "yearly",
    appliesTo: ["product_premium", "service_premium"],
    active: true,
    createdAt: timestamp,
  },
};

// -------------------------------
// SEED FUNCTION
// -------------------------------
async function seedPlans() {
  const batch = db.batch();

  Object.entries(plans).forEach(([id, data]) => {
    const ref = db.collection("subscriptionPlans").doc(id);
    batch.set(ref, data);
  });

  await batch.commit();
  console.log("🔥 Subscription plans added successfully!");
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
