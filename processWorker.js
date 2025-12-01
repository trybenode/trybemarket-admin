import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebaseAdmin';

// --- CONFIGURATION ---
const BATCH_SEND_SIZE = 5; // Small size for testing/worker logic clarity (increase to 200 in prod)
const MAX_RETRIES = 3;
const POLLING_INTERVAL_MS = 5000; // Check for new jobs every 5 seconds

// --- A. Nodemailer Configuration (Same as API Route) ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : '',
    },
});

// --- B. Worker Logic Functions ---

/**
 * Exponential backoff delay for retries.
 * @param {number} attempt - Current retry attempt (1 to MAX_RETRIES)
 */
const delay = (attempt) => new Promise(resolve => {
    const time = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
    console.log(`Waiting for ${time / 1000}s before retry ${attempt}...`);
    setTimeout(resolve, time);
});


/**
 * Core function to send emails for a batch and update Firestore transactionally.
 * @param {FirebaseFirestore.DocumentReference} jobBatchRef - Reference to the specific batch document.
 * @param {object} masterJobData - Data from the master job record.
 */
async function processBatch(jobBatchRef, masterJobData) {
    console.log(`\n--- Starting processing for Batch: ${jobBatchRef.id} ---`);

    return adminDb.runTransaction(async (transaction) => {
        // 1. Fetch the latest state of the batch document
        const batchDoc = await transaction.get(jobBatchRef);
        const batchData = batchDoc.data();

        if (!batchDoc.exists) {
            console.error('Batch document disappeared, skipping.');
            return;
        }

        // 2. Check Idempotency (Prevent resending)
        if (batchData.status === 'SENT' || batchData.processedByWorker === true) {
            console.log(`Batch ${jobBatchRef.id} already processed. Skipping.`);
            return;
        }

        const recipients = batchData.recipients || [];
        const compiledHtml = masterJobData.compiledHtml;
        let sentCount = batchData.sentCount || 0;
        let failedCount = batchData.failedCount || 0;
        let emailsToSend = [];

        // 3. Identify pending emails (Emails that haven't been successfully sent)
        // Check if an email has 'sent: true' or 'retries' < MAX_RETRIES
        recipients.forEach((recipient, index) => {
            // Find recipients that are NOT marked as successfully sent
            if (!recipient.sent) {
                // Check if they are eligible for retry
                const currentRetries = recipient.retries || 0;
                
                if (currentRetries < MAX_RETRIES) {
                    emailsToSend.push({ ...recipient, indexInBatch: index });
                } else {
                    console.log(`Recipient ${recipient.email} max retries reached. Failing permanently.`);
                    failedCount++;
                }
            }
        });
        
        console.log(`Found ${emailsToSend.length} emails to process/retry.`);

        // 4. Send Emails in small chunks (Worker Batching)
        const sendPromises = emailsToSend.slice(0, WORKER_BATCH_SIZE).map(async (recipient) => {
            const mailOptions = {
                from: {
                    name: process.env.SENDER_NAME,
                    address: process.env.SENDER_EMAIL,
                },
                to: recipient.email,
                subject: masterJobData.subject,
                html: compiledHtml.replace('{{userName}}', recipient.fullName), // Final personalization step
            };

            try {
                // Use await here to catch errors synchronously in the loop
                await transporter.sendMail(mailOptions);
                
                // Success: Mark the recipient as sent
                recipients[recipient.indexInBatch].sent = true;
                recipients[recipient.indexInBatch].sentAt = new Date().toISOString();
                sentCount++;

            } catch (mailError) {
                // Failure: Increment retry count
                const newRetries = (recipients[recipient.indexInBatch].retries || 0) + 1;
                recipients[recipient.indexInBatch].retries = newRetries;
                recipients[recipient.indexInBatch].lastError = mailError.message;
                
                if (newRetries >= MAX_RETRIES) {
                    failedCount++; // Count as failed only after hitting the max limit
                }
                
                console.error(`Send failed for ${recipient.email} (Attempt ${newRetries}/${MAX_RETRIES}): ${mailError.message}`);
                
                // If this is not the last attempt, we schedule a retry by NOT marking the batch processed yet.
                if (newRetries < MAX_RETRIES) {
                    // Introduce exponential backoff delay before the next polling interval checks again
                    await delay(newRetries);
                }
            }
        });
        
        // Wait for all email promises in this chunk to settle
        await Promise.all(sendPromises);

        // 5. Update the Batch Status Transactionally
        const allEmailsProcessed = recipients.every(r => r.sent || (r.retries || 0) >= MAX_RETRIES);
        
        // Final status is SENT only if all emails in the batch have been attempted MAX_RETRIES times
        const newStatus = allEmailsProcessed ? 'SENT' : 'RETRY_PENDING';
        
        transaction.update(jobBatchRef, {
            status: newStatus,
            recipients: recipients, // Update the recipient array with new status/retries
            sentCount: sentCount,
            failedCount: failedCount,
            processedByWorker: allEmailsProcessed, // Mark TRUE only when completely done
            lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Batch ${jobBatchRef.id} finished processing. Status: ${newStatus}`);
    });
}


/**
 * Main worker loop that polls Firestore for pending batches.
 */
async function workerLoop() {
    try {
        // Query for PENDING batches from all jobs
        const pendingBatchesQuery = adminDb.collectionGroup('batches')
            .where('status', 'in', ['PENDING', 'RETRY_PENDING'])
            .orderBy('createdAt', 'asc')
            .limit(10); // Process 10 batches per loop iteration

        const snapshot = await pendingBatchesQuery.get();

        if (snapshot.empty) {
            console.log(`[${new Date().toLocaleTimeString()}] No pending batches found.`);
            return;
        }

        console.log(`[${new Date().toLocaleTimeString()}] Found ${snapshot.size} pending batches. Starting processing.`);

        // Process each batch sequentially for safety and resource management
        for (const doc of snapshot.docs) {
            const batchRef = doc.ref;
            const masterJobId = batchRef.parent.parent.id; // Get ID of the master job
            
            // Fetch the master job record to get the compiled HTML
            const masterJobData = (await adminDb.collection('bulkEmailJobs').doc(masterJobId).get()).data();
            
            if (masterJobData) {
                // Process the batch within a transaction
                await processBatch(batchRef, masterJobData);
            } else {
                console.error(`Master job ${masterJobId} not found for batch ${batchRef.id}.`);
            }
        }

    } catch (error) {
        console.error('CRITICAL WORKER ERROR:', error);
    }
}

// --- Start the Worker ---
console.log(`Bulk Email Worker starting. Polling every ${POLLING_INTERVAL_MS / 1000} seconds.`);

// Use setInterval to run the worker logic repeatedly
setInterval(workerLoop, POLLING_INTERVAL_MS);

// Run the worker immediately on startup
workerLoop();