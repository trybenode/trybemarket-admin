import { adminDb } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

// ─── Config ───
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PUSH_BATCH_SIZE = 100;
const EMAIL_BATCH_SIZE = 50;

const WHATSAPP_API_URL =
  process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v22.0";
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || "1117077824813339";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_TEMPLATE_NAME =
  process.env.WHATSAPP_BROADCAST_TEMPLATE || "broadcast_message";

// Nodemailer transporter (same SMTP as existing email routes)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
  },
});

// ─── Helpers ───

function loadTemplate(name) {
  const filePath = path.join(process.cwd(), "templates", `${name}.hbs`);
  const source = fs.readFileSync(filePath, "utf-8");
  return Handlebars.compile(source);
}

function isValidExpoPushToken(token) {
  if (!token || typeof token !== "string") return false;
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

/**
 * Fetch target users from Firestore based on audience config
 */
async function fetchRecipients(audience) {
  const { type, segment, userIds, university } = audience;
  const db = adminDb;

  if (type === "individual" && userIds?.length > 0) {
    // Fetch specific users by ID (batched in groups of 30 for Firestore "in" limit)
    const users = [];
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const snap = await db
        .collection("users")
        .where("__name__", "in", chunk)
        .get();
      snap.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
    }
    return users;
  }

  if (type === "segment") {
    let query = db.collection("users");

    if (segment === "verified_sellers") {
      query = query.where("isVerified", "==", true);
    } else if (segment === "unverified") {
      query = query.where("isVerified", "==", false);
    } else if (segment === "university" && university) {
      query = query.where("university", "==", university);
    } else if (segment === "premium") {
      // Users with active paid subscriptions
      // We'll fetch all and filter since Firestore can't query nested subscription status easily
      const snap = await db.collection("users").get();
      const users = [];
      snap.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
      // Check if they have any active subscription via the subscriptions collection
      const premiumUsers = [];
      for (const user of users) {
        try {
          const subSnap = await db.collection("subscriptions").doc(user.id).get();
          if (subSnap.exists) {
            const sub = subSnap.data();
            const hasActive =
              sub.product?.isActive || sub.service?.isActive || sub.bundle?.isActive;
            if (hasActive) premiumUsers.push(user);
          }
        } catch {
          // skip
        }
      }
      return premiumUsers;
    }

    const snap = await query.get();
    const users = [];
    snap.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
    return users;
  }

  // Default: all users
  const snap = await db.collection("users").get();
  const users = [];
  snap.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
  return users;
}

/**
 * Send push notifications in batches via Expo
 */
async function sendPushBatch(users, title, body) {
  const messages = users
    .filter((u) => isValidExpoPushToken(u.expoPushToken))
    .map((u) => ({
      to: u.expoPushToken,
      title,
      body,
      sound: "default",
      channelId: "messages",
      priority: "high",
      data: { type: "broadcast" },
    }));

  if (messages.length === 0) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += PUSH_BATCH_SIZE) {
    const chunk = messages.slice(i, i + PUSH_BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const result = await res.json();
      const tickets = Array.isArray(result.data) ? result.data : [result.data];
      tickets.forEach((t) => {
        if (t?.status === "ok") sent++;
        else failed++;
      });
    } catch (err) {
      console.error("[BROADCAST PUSH] Batch error:", err.message);
      failed += chunk.length;
    }
  }

  return { sent, failed, total: messages.length };
}

/**
 * Send emails in batches via Nodemailer
 */
async function sendEmailBatch(users, subject, htmlContent) {
  const recipients = users.filter((u) => u.email);
  if (recipients.length === 0) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += EMAIL_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + EMAIL_BATCH_SIZE);
    const promises = chunk.map(async (user) => {
      try {
        await transporter.sendMail({
          from: {
            name: process.env.SENDER_NAME || "TrybeMarket",
            address: process.env.SENDER_EMAIL || "contact@trybemarket.online",
          },
          to: user.email,
          subject,
          html: htmlContent,
        });
        sent++;
      } catch (err) {
        console.error(`[BROADCAST EMAIL] Failed for ${user.email}:`, err.message);
        failed++;
      }
    });
    await Promise.all(promises);
  }

  return { sent, failed, total: recipients.length };
}

/**
 * Send WhatsApp messages via Business API
 * Note: WhatsApp Business API requires pre-approved templates for broadcast.
 * This sends a simple text template. For custom messages, you need a template
 * with parameters approved by Meta.
 */
async function sendWhatsAppBatch(users, messageBody) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.warn("[BROADCAST WA] No WhatsApp access token configured");
    return { sent: 0, failed: 0, total: 0, skipped: true };
  }

  const recipients = users.filter((u) => u.phone || u.phoneNumber);
  if (recipients.length === 0) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  for (const user of recipients) {
    const phone = (user.phone || user.phoneNumber || "").replace(/[^0-9]/g, "");
    if (!phone || phone.length < 10) {
      failed++;
      continue;
    }

    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: WHATSAPP_TEMPLATE_NAME,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: messageBody.substring(0, 200) }],
              },
            ],
          },
        }),
      });

      const data = await res.json();
      if (data.messages?.[0]?.id) {
        sent++;
      } else {
        console.error("[BROADCAST WA] Failed for", phone, data.error?.message);
        failed++;
      }
    } catch (err) {
      console.error("[BROADCAST WA] Error:", err.message);
      failed++;
    }
  }

  return { sent, failed, total: recipients.length };
}

// ─── Main Handler ───

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const {
    channels = [],    // ["push", "email", "whatsapp"]
    audience = {},    // { type: "all" | "segment" | "individual", segment?, university?, userIds? }
    subject = "",     // Email subject
    title = "",       // Push notification title
    body = "",        // Message body (shared across channels)
    adminName = "",   // Who sent it
  } = req.body;

  if (!channels.length) {
    return res.status(400).json({ error: "At least one channel must be selected" });
  }
  if (!body.trim()) {
    return res.status(400).json({ error: "Message body is required" });
  }

  try {
    console.log("[BROADCAST] Starting broadcast:", {
      channels,
      audience: audience.type,
      segment: audience.segment,
    });

    // Step 1: Fetch recipients
    const users = await fetchRecipients(audience);
    console.log(`[BROADCAST] Fetched ${users.length} recipients`);

    if (users.length === 0) {
      return res.status(400).json({ error: "No users match the selected audience" });
    }

    // Step 2: Send to each channel in parallel
    const results = {};
    const promises = [];

    if (channels.includes("push")) {
      const pushTitle = title || "TrybeMarket";
      promises.push(
        sendPushBatch(users, pushTitle, body).then((r) => {
          results.push = r;
        })
      );
    }

    if (channels.includes("email")) {
      const emailSubject = subject || "Message from TrybeMarket";
      // Compile the newsletter template with the broadcast body
      let htmlContent;
      try {
        const compiler = loadTemplate("newsletter");
        htmlContent = compiler({
          body,
          adminName: adminName || "TrybeMarket Team",
          currentYear: new Date().getFullYear(),
        });
      } catch {
        // Fallback: simple HTML if template not available
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #1a365d;">TrybeMarket</h2>
            <div style="padding: 20px 0; line-height: 1.6; color: #333;">
              ${body.replace(/\n/g, "<br>")}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              Sent by ${adminName || "TrybeMarket Team"} &bull;
              <a href="https://trybemarket.online">trybemarket.online</a>
            </p>
          </div>
        `;
      }
      promises.push(
        sendEmailBatch(users, emailSubject, htmlContent).then((r) => {
          results.email = r;
        })
      );
    }

    if (channels.includes("whatsapp")) {
      promises.push(
        sendWhatsAppBatch(users, body).then((r) => {
          results.whatsapp = r;
        })
      );
    }

    await Promise.all(promises);

    // Step 3: Log the broadcast to Firestore
    const totalSent = Object.values(results).reduce((sum, r) => sum + (r.sent || 0), 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + (r.failed || 0), 0);

    await adminDb.collection("broadcastLogs").add({
      channels,
      audience,
      subject: subject || title || "Broadcast",
      body: body.substring(0, 500),
      adminName,
      recipientCount: users.length,
      results,
      totalSent,
      totalFailed,
      createdAt: new Date().toISOString(),
    });

    console.log("[BROADCAST] Complete:", results);

    return res.status(200).json({
      success: true,
      recipientCount: users.length,
      results,
      totalSent,
      totalFailed,
    });
  } catch (error) {
    console.error("[BROADCAST] Error:", error);
    return res.status(500).json({
      error: "Broadcast failed",
      details: error.message,
    });
  }
}
