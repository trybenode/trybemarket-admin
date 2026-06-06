import { adminDb } from "@/lib/firebaseAdmin";

const COLLECTION = "financeTransactions";

// Roles that can add/edit/delete transactions
const WRITE_ROLES = ["super-admin", "operations"];

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res);
  }
  return res.status(405).json({ error: "Method Not Allowed" });
}

// ─── GET: List transactions with optional filters ───
async function handleGet(req, res) {
  try {
    const { type, category, month, year, limit: queryLimit } = req.query;
    let query = adminDb.collection(COLLECTION).orderBy("date", "desc");

    // Filter by type (income / expense)
    if (type && (type === "income" || type === "expense")) {
      query = query.where("type", "==", type);
    }

    // Filter by category
    if (category) {
      query = query.where("category", "==", category);
    }

    // Limit results
    const maxResults = parseInt(queryLimit) || 200;
    query = query.limit(maxResults);

    const snap = await query.get();
    const transactions = [];
    snap.forEach((doc) => {
      const data = doc.data();
      transactions.push({ id: doc.id, ...data });
    });

    // Client-side filter for month/year (Firestore can't do range + orderBy on different fields easily)
    let filtered = transactions;
    if (month || year) {
      filtered = transactions.filter((t) => {
        const d = new Date(t.date);
        if (year && d.getFullYear() !== parseInt(year)) return false;
        if (month && d.getMonth() + 1 !== parseInt(month)) return false;
        return true;
      });
    }

    return res.status(200).json({ success: true, transactions: filtered });
  } catch (error) {
    console.error("[FINANCE GET] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ─── POST: Add a new transaction ───
async function handlePost(req, res) {
  try {
    const {
      type,         // "income" | "expense"
      amount,       // number
      category,     // string
      description,  // what was it for
      reference,    // receipt number, invoice, etc.
      date,         // ISO date string
      addedBy,      // admin name
      addedByRole,  // admin role
      addedByUid,   // admin uid
      notes,        // optional extra notes
    } = req.body;

    // Role check
    if (!WRITE_ROLES.includes(addedByRole)) {
      return res.status(403).json({
        error: "You don't have permission to add financial records",
      });
    }

    // Validation
    if (!type || !["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    if (!category?.trim()) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!description?.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const transaction = {
      type,
      amount: Number(amount),
      category: category.trim(),
      description: description.trim(),
      reference: reference?.trim() || "",
      date,
      notes: notes?.trim() || "",
      addedBy: addedBy || "Unknown",
      addedByUid: addedByUid || "",
      addedByRole: addedByRole || "",
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection(COLLECTION).add(transaction);

    console.log("[FINANCE] Transaction added:", docRef.id, type, amount);

    return res.status(201).json({
      success: true,
      id: docRef.id,
      transaction: { id: docRef.id, ...transaction },
    });
  } catch (error) {
    console.error("[FINANCE POST] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ─── DELETE: Remove a transaction ───
async function handleDelete(req, res) {
  try {
    const { id, role } = req.query;

    if (!WRITE_ROLES.includes(role)) {
      return res.status(403).json({
        error: "You don't have permission to delete financial records",
      });
    }

    if (!id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    await adminDb.collection(COLLECTION).doc(id).delete();

    console.log("[FINANCE] Transaction deleted:", id);

    return res.status(200).json({ success: true, deletedId: id });
  } catch (error) {
    console.error("[FINANCE DELETE] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
