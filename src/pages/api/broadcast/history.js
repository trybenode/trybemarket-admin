import { adminDb } from "@/lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const limit = parseInt(req.query.limit) || 20;

    const snap = await adminDb
      .collection("broadcastLogs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const logs = [];
    snap.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("[BROADCAST HISTORY] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
