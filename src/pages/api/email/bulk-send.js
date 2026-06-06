import { adminDb } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import Handlebars from "handlebars";

// Configuration
const BATCH_SIZE = 50; // Send 50 emails concurrently per batch

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
  },
});

const loadAndCompileTemplate = (templateName) => {
  const filePath = path.join(process.cwd(), "templates", `${templateName}.hbs`);
  const source = fs.readFileSync(filePath, "utf-8");
  return Handlebars.compile(source);
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { target, selectedEmails, subject, body, adminName } = req.body;

  if (!subject?.trim() || !body?.trim()) {
    return res.status(400).json({ error: "Subject and body are required." });
  }

  try {
    const db = adminDb;
    let recipients = [];

    // ─── Step 1: Fetch recipients ───
    if (target === "all_users") {
      const cacheSnap = await db
        .collection("admin_metadata")
        .doc("user_index")
        .get();
      if (!cacheSnap.exists)
        throw new Error("User index not found. Please sync first.");
      recipients = cacheSnap.data().emails.map((u) => u.value);
    } else {
      recipients = selectedEmails || [];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipients selected." });
    }

    // ─── Step 2: Compile email template ───
    const templateCompiler = loadAndCompileTemplate("newsletter");
    const htmlContent = templateCompiler({
      body,
      adminName: adminName || "Admin Team",
      currentYear: new Date().getFullYear(),
    });

    // ─── Step 3: Create job record for tracking ───
    const jobRef = db.collection("mailJobs").doc();
    await jobRef.set({
      subject,
      adminName,
      status: "SENDING",
      totalRecipients: recipients.length,
      createdAt: new Date().toISOString(),
    });

    // ─── Step 4: Send emails in batches ───
    let sent = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        chunk.map((email) =>
          transporter.sendMail({
            from: {
              name: process.env.SENDER_NAME || "TrybeMarket",
              address: process.env.SENDER_EMAIL || "contact@trybemarket.online",
            },
            to: email,
            subject,
            html: htmlContent,
          })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failed++;
          failures.push({
            email: chunk[idx],
            error: result.reason?.message || "Unknown error",
          });
        }
      });
    }

    // ─── Step 5: Update job record with results ───
    await jobRef.update({
      status: failed === 0 ? "COMPLETED" : "PARTIAL",
      sent,
      failed,
      failures: failures.slice(0, 50), // Store first 50 failures for debugging
      completedAt: new Date().toISOString(),
    });

    console.log(
      `[BULK EMAIL] Job ${jobRef.id}: ${sent} sent, ${failed} failed out of ${recipients.length}`
    );

    return res.status(200).json({
      success: true,
      jobId: jobRef.id,
      totalAttempted: recipients.length,
      sent,
      failed,
      message: `Sent ${sent} of ${recipients.length} emails.${
        failed > 0 ? ` ${failed} failed.` : ""
      }`,
    });
  } catch (error) {
    console.error("Bulk Send Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
