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

// --- C. Main Handler ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Collect all possible data fields from the frontend payload
    const { 
        templateId, // MUST be passed from frontend
        productId, delistReason, 
        recipient, customSubject, customBody,
        adminName 
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
                // Pass the custom body and admin name to the template's shell
                customBody: customBody,
                adminName: adminName,
                // Note: We don't fetch user data here; the "Hello User" greeting is generic
            };

            finalSubject = customSubject;
            finalBody = templateCompiler(templateData);
            toEmail = recipient;

        } else {
            return res.status(400).json({ error: 'Invalid templateId provided.' });
        }

        // --- COMMON EMAIL SEND STEP ---
        const mailOptions = {
            from: {
                name: process.env.SENDER_NAME,
                address: process.env.SENDER_EMAIL,
            },
            to: toEmail,
            subject: finalSubject,
            html: finalBody,
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log(`${templateId} email sent: %s`, info.messageId);

        return res.status(200).json({ message: `${templateId} email sent successfully`, messageId: info.messageId });

    } catch (error) {
        // Log error and return JSON response on crash
        console.error('Final API Route Failure:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal Server Error', 
            details: 'Check server logs for specific failure reason.' 
        });
    }
}