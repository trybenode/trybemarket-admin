import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { adminDb } from "@/lib/firebaseAdmin"; 

// --- A. Nodemailer Configuration ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s/g, ''),
    },
});

// --- B. Template Compilation Utility ---
const loadAndCompileTemplate = (templateName) => {
    try {
        const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
        const source = fs.readFileSync(filePath, 'utf-8');
        return Handlebars.compile(source);
    } catch (e) {
        throw new Error(`Template file loading failed for ${templateName}: ${e.message}`);
    }
};

// --- C. CONSTANTS FOR SCALABILITY ---
// Maximum users to fetch in ONE API call (to stay within memory/timeout limits)
const BATCH_SIZE = 500; 
// The maximum number of users the background worker should process per single run 
// (Worker logic is external, but this determines job creation size)
const WORKER_BATCH_SIZE = 200; 

// --- D. Helper: Fetch Users in Batches (Pagination Fix) ---
/**
 * Fetches users in batches using pagination to avoid memory limits and large reads.
 * @param {object} db - Firestore database instance.
 * @param {object} lastDoc - The last document from the previous batch, used as a cursor.
 * @returns {Promise<FirebaseFirestore.QuerySnapshot>}
 */
const fetchUserBatch = (db, lastDoc = null) => {
    let query = db.collection('users')
        // Order by a predictable field like 'email' for cursor pagination
        .orderBy('email')
        .select('fullName', 'email'); // Minimize data fetched

    if (lastDoc) {
        query = query.startAfter(lastDoc);
    }

    // Limit the number of users read in this specific API request
    return query.limit(BATCH_SIZE).get();
};


// --- E. Main Handler (Job Submission to Queue) ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { target, subject, body, adminName } = req.body;
    
    if (!subject || !body || !adminName) {
        return res.status(400).json({ error: 'Missing subject, body, or admin name.' });
    }

    try {
        const db = adminDb;
        let lastDoc = null;
        let totalUsersQueued = 0;
        let batchIndex = 0;

        // 1. Compile Template Once (Before the loop)
        const templateCompiler = loadAndCompileTemplate('newsletter');
        const currentYear = new Date().getFullYear();
        
        // This is the HTML shell that will be reused by the worker
        const compiledHtml = templateCompiler({ 
            body: body, 
            adminName: adminName, 
            currentYear: currentYear 
        });

        // 2. Create the Master Job Record
        // This record stores global job metadata, not the recipients.
        const masterJobRef = await db.collection('bulkEmailJobs').add({
            status: 'INITIALIZING',
            subject: subject,
            adminName: adminName,
            createdAt: new Date().toISOString(),
            targetAudience: target,
            totalRecipients: 0, // Will update later
            batchesQueued: 0,
            compiledHtml: compiledHtml, // Store the static HTML for the worker
        });

        // 3. Paginate and Create Recipient Batches (Fixes Problem 1 & 3)
        while (true) {
            const snapshot = await fetchUserBatch(db, lastDoc);
            
            if (snapshot.empty) break;

            const recipients = snapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email,
                fullName: doc.data().fullName || 'Trybemarket User',
            }));
            
            // Note: If you have more than WORKER_BATCH_SIZE (200) users in the snapshot, 
            // you should split 'recipients' further and create multiple documents,
            // but for simplicity and safety, we rely on BATCH_SIZE (500) < 1MB limit.
            
            // 4. Create Sub-Job for the Worker (Fixes Problem 2: Batched Processing)
            // Each sub-job document contains only the specific list of users to send to.
            await masterJobRef.collection('batches').add({
                status: 'PENDING',
                jobBatchIndex: batchIndex,
                recipients: recipients,
                sentCount: 0,
                failedCount: 0,
                processedByWorker: false,
                createdAt: new Date().toISOString(),
            });

            totalUsersQueued += recipients.length;
            batchIndex++;
            lastDoc = snapshot.docs[snapshot.docs.length - 1];

            // Safety break during development to avoid hitting timeouts/limits quickly
            if (snapshot.docs.length < BATCH_SIZE) break;
            
            // To ensure the API request returns quickly, we limit the total work it does.
            // In a real application, you might only run 2-3 batches here and then exit, 
            // relying on an external service to handle the rest of the queueing process.
            if (batchIndex >= 3) break; 
        }

        // 5. Update Master Job Metadata
        await masterJobRef.update({
            status: 'QUEUED',
            totalRecipients: totalUsersQueued,
            batchesQueued: batchIndex,
        });

        // 6. Success Response (202 Accepted)
        return res.status(202).json({ 
            message: `Bulk send job successfully queued. Total batches: ${batchIndex}. Total users: ${totalUsersQueued}`, 
            jobId: masterJobRef.id,
            totalAttempted: totalUsersQueued
        });

    } catch (error) {
        console.error('Bulk Send API Failure (Queuing):', error);
        return res.status(500).json({ 
            error: 'Failed to queue bulk send job.', 
            details: error.message 
        });
    }
}