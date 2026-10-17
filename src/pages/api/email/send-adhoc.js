import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { adminDb } from "@/lib/firebaseAdmin"; 
import { requireAdminPages } from "@/lib/requireAdmin";
import { sendEmail } from "@/lib/mailer";

// --- A. Sending ---
// Through Resend as TrybeMarket <contact@trybemarket.online> (src/lib/mailer.js).
// The previous SMTP setup wasn't delivering in production.

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

// --- C. Main Handler ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Admin-only: this sends email from the company address to any address.
    // The sender name is the verified admin's, never a client-supplied one.
    const admin = await requireAdminPages(req, res);
    if (!admin) return;
    const adminName = admin.name;

    // Collect all possible data fields from the frontend payload
    const { 
        templateId, // MUST be passed from frontend
        productId, delistReason, 
        recipient, customSubject, customBody,
    } = req.body;

    let finalSubject, finalBody, toEmail;

    try {
        const db = adminDb; // Use your imported, initialized Firestore instance

        if (templateId === 'PRODUCT_DELIST') {
            // --- LOGIC FOR PRODUCT_DELIST ---
            if (!productId || !delistReason || !adminName) {
                return res.status(400).json({ error: 'Missing required fields for delisting.' });
            }
            
            // 1. Fetch Product & User Details
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) { return res.status(404).json({ error: 'Product not found in Firestore.' }); }
            const productData = productDoc.data();
            
            const userDoc = await db.collection('users').doc(productData.userId).get();
            if (!userDoc.exists) { return res.status(404).json({ error: 'Seller not found in Firestore.' }); }
            const userData = userDoc.data();

            // 2. Compile Template
            const templateCompiler = loadAndCompileTemplate('product_delist');
            const templateData = {
                userName: userData.fullName,
                productName: productData.name,
                productBrand: productData.brand,
                productPrice: productData.price.toLocaleString(),
                delistReason: delistReason,
                adminName: adminName,
            };

            finalSubject = `Important: Your Product ${productData.name} Has Been Delisted`;
            finalBody = templateCompiler(templateData);
            toEmail = userData.email;

        } else if (templateId === 'CUSTOM_OUTREACH') {
            // --- LOGIC FOR CUSTOM_OUTREACH (UPDATED TO USE TEMPLATE) ---
            if (!recipient || !customSubject || !customBody || !adminName) {
                return res.status(400).json({ error: 'Missing recipient, subject, body, or admin name for custom message.' });
            }

            // Load and Compile the custom_outreach template
            const templateCompiler = loadAndCompileTemplate('custom_outreach');
            
            const templateData = {
                customBody: customBody,
                adminName: adminName,
                currentYear: new Date().getFullYear(),
            };

            finalSubject = customSubject;
            finalBody = templateCompiler(templateData);
            toEmail = recipient;

        } else {
            return res.status(400).json({ error: 'Invalid templateId provided.' });
        }

        // --- COMMON EMAIL SEND STEP ---
        const info = await sendEmail({
            to: toEmail,
            subject: finalSubject,
            html: finalBody,
        });

        console.log(`${templateId} email sent: %s`, info.id);

        return res.status(200).json({ message: `${templateId} email sent successfully`, messageId: info.id });

    } catch (error) {
        // Log error and return JSON response on crash
        console.error('Final API Route Failure:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal Server Error', 
            details: 'Check server logs for specific failure reason.' 
        });
    }
}