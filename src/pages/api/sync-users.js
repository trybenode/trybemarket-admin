import { adminDb } from "@/lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const db = adminDb;
    console.log('--- Starting Production User Index Sync ---');

    // 1. Fetch real users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('--- No users found in database ---');
      return res.status(200).json({ success: true, count: 0, emails: [] });
    }

    // 2. Map data for the multi-select dropdown
    const userList = usersSnapshot.docs
      .map(doc => {
        const data = doc.data();
        // Fallback logic to ensure value is never undefined
        const email = data.email || data.userEmail; 
        if (!email) return null;

        return {
          value: email,
          label: data.fullName ? `${email} (${data.fullName})` : email
        };
      })
      .filter(item => item !== null); // Clean up users with missing emails

    // 3. Update the single Cache Document
    const cacheRef = db.collection('admin_metadata').doc('user_index');
    
    await cacheRef.set({
      emails: userList,
      lastUpdated: new Date().toISOString(),
      totalCount: userList.length,
    });

    console.log(`--- Sync Complete: ${userList.length} users indexed ---`);

    return res.status(200).json({ 
      success: true, 
      count: userList.length,
      dummyData: userList, // Still send this so the UI updates instantly
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Production Sync Error:', error);
    return res.status(500).json({ 
      error: 'Failed to sync user emails',
      details: error.message 
    });
  }
}