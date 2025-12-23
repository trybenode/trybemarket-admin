import { adminDb } from "@/lib/firebaseAdmin";
import path from 'path';
import fs from 'fs';
import Handlebars from 'handlebars';

// Configuration
const CHUNK_SIZE = 150; // Smaller chunks to ensure individual worker success

const loadAndCompileTemplate = (templateName) => {
    const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf-8');
    return Handlebars.compile(source);
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { target, selectedEmails, subject, body, adminName } = req.body;

    try {
        const db = adminDb;
        let recipients = [];

        // --- STEP 1: COST EFFECTIVE RECIPIENT FETCH ---
        if (target === 'all_users') {
            // Read ONLY the cached index document (1 Read regardless of user count)
            const cacheSnap = await db.collection('admin_metadata').doc('user_index').get();
            if (!cacheSnap.exists) throw new Error("User index not found. Please sync first.");
            recipients = cacheSnap.data().emails.map(u => u.value);
        } else {
            recipients = selectedEmails || [];
        }

        if (recipients.length === 0) return res.status(400).json({ error: "No recipients selected." });

        // --- STEP 2: PREPARE TEMPLATE ---
        const templateCompiler = loadAndCompileTemplate('newsletter');
        const htmlShell = templateCompiler({ 
            body, 
            adminName, 
            currentYear: new Date().getFullYear() 
        });

        // --- STEP 3: CREATE THE MASTER JOB RECORD ---
        const masterJobRef = db.collection('mailJobs').doc();
        const batchRefs = [];

        // Split recipients into chunks (Batching)
        for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
            batchRefs.push(recipients.slice(i, i + CHUNK_SIZE));
        }

        // --- STEP 4: ATOMIC QUEUING (Writing batches) ---
        // We use a Firestore Write Batch for efficiency and atomicity
        const batchWriter = db.batch();
        
        // Create the summary job
        batchWriter.set(masterJobRef, {
            subject,
            adminName,
            status: 'QUEUED',
            totalRecipients: recipients.length,
            totalBatches: batchRefs.length,
            createdAt: new Date().toISOString(),
        });

        // Create individual batch tasks
        batchRefs.forEach((chunk, index) => {
            const taskRef = db.collection('mailQueue').doc();
            batchWriter.set(taskRef, {
                jobId: masterJobRef.id,
                batchIndex: index,
                recipients: chunk, // Array of emails
                subject: subject,
                html: htmlShell, // Pass the compiled HTML to the worker
                status: 'PENDING',
                attempts: 0,
                createdAt: new Date().toISOString(),
            });
        });

        await batchWriter.commit();
        

        return res.status(202).json({ 
            success: true, 
            jobId: masterJobRef.id, 
            totalAttempted: recipients.length,
            message: `Created ${batchRefs.length} parallel mailing tasks.`
        });

    } catch (error) {
        console.error('Bulk Send Error:', error);
        return res.status(500).json({ error: error.message });
    }
}