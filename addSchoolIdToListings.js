/**
 * Script to add schoolId field to products and services
 * This script finds a school by name and adds its ID to all products/services with matching university field
 */

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

/**
 * Add schoolId to products and services for a specific school
 */
async function addSchoolIdToListings(schoolName) {
  try {
    console.log(`\n🔍 Looking for school: "${schoolName}"\n`);
    
    // Step 1: Find the school by name
    const schoolsRef = db.collection('schools');
    const schoolSnapshot = await schoolsRef.where('name', '==', schoolName).get();
    
    if (schoolSnapshot.empty) {
      console.error(`❌ School "${schoolName}" not found in schools collection`);
      return;
    }
    
    const schoolDoc = schoolSnapshot.docs[0];
    const schoolId = schoolDoc.id;
    const schoolData = schoolDoc.data();
    
    console.log(`✅ Found school:`);
    console.log(`   ID: ${schoolId}`);
    console.log(`   Name: ${schoolData.name}`);
    console.log(`   Location: ${schoolData.location || 'N/A'}`);
    console.log(`   Type: ${schoolData.type || 'N/A'}\n`);
    
    // Step 2: Update products with matching university field
    console.log(`📦 Updating products...\n`);
    const productsSnapshot = await db.collection('products')
      .where('university', '==', schoolName)
      .get();
    
    console.log(`   Found ${productsSnapshot.docs.length} products to update`);
    
    if (productsSnapshot.docs.length > 0) {
      let productBatch = db.batch();
      let productBatchCount = 0;
      let totalProductsUpdated = 0;
      
      for (const productDoc of productsSnapshot.docs) {
        productBatch.update(productDoc.ref, { schoolId: schoolId });
        productBatchCount++;
        
        // Firestore batch limit is 500 operations
        if (productBatchCount === 500) {
          await productBatch.commit();
          totalProductsUpdated += productBatchCount;
          console.log(`   ✓ Committed batch: ${totalProductsUpdated} products updated so far...`);
          productBatch = db.batch();
          productBatchCount = 0;
        }
      }
      
      // Commit remaining batch
      if (productBatchCount > 0) {
        await productBatch.commit();
        totalProductsUpdated += productBatchCount;
      }
      
      console.log(`   ✅ Updated ${totalProductsUpdated} products\n`);
    } else {
      console.log(`   ℹ️  No products found with university="${schoolName}"\n`);
    }
    
    // Step 3: Update services with matching university field
    console.log(`🛠️  Updating services...\n`);
    const servicesSnapshot = await db.collection('services')
      .where('university', '==', schoolName)
      .get();
    
    console.log(`   Found ${servicesSnapshot.docs.length} services to update`);
    
    if (servicesSnapshot.docs.length > 0) {
      let serviceBatch = db.batch();
      let serviceBatchCount = 0;
      let totalServicesUpdated = 0;
      
      for (const serviceDoc of servicesSnapshot.docs) {
        serviceBatch.update(serviceDoc.ref, { schoolId: schoolId });
        serviceBatchCount++;
        
        // Firestore batch limit is 500 operations
        if (serviceBatchCount === 500) {
          await serviceBatch.commit();
          totalServicesUpdated += serviceBatchCount;
          console.log(`   ✓ Committed batch: ${totalServicesUpdated} services updated so far...`);
          serviceBatch = db.batch();
          serviceBatchCount = 0;
        }
      }
      
      // Commit remaining batch
      if (serviceBatchCount > 0) {
        await serviceBatch.commit();
        totalServicesUpdated += serviceBatchCount;
      }
      
      console.log(`   ✅ Updated ${totalServicesUpdated} services\n`);
    } else {
      console.log(`   ℹ️  No services found with university="${schoolName}"\n`);
    }
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`   School ID "${schoolId}" has been added to all matching products and services.\n`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  // Change this to your school's exact name as it appears in the database
  const schoolName = 'Lead City University of Ibadan';
  
  console.log('\n========================================');
  console.log('  Add School ID to Listings Script');
  console.log('========================================\n');
  console.log(`Target School: "${schoolName}"`);
  console.log('This script will:');
  console.log('  1. Find the school by name');
  console.log('  2. Add schoolId field to all products with matching university');
  console.log('  3. Add schoolId field to all services with matching university\n');
  
  try {
    await addSchoolIdToListings(schoolName);
    console.log('✅ Script completed successfully!\n');
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
main();
