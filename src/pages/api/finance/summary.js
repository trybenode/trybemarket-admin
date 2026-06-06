import { adminDb } from "@/lib/firebaseAdmin";

const COLLECTION = "financeTransactions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy("date", "desc")
      .get();

    const transactions = [];
    snap.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    // ─── Overall totals ───
    let totalIncome = 0;
    let totalExpense = 0;

    // ─── Monthly breakdown ───
    const monthlyMap = {}; // "2026-04" => { income: 0, expense: 0 }

    // ─── Category breakdown ───
    const categoryIncome = {};
    const categoryExpense = {};

    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      const monthKey = t.date ? t.date.substring(0, 7) : "unknown"; // "YYYY-MM"

      if (t.type === "income") {
        totalIncome += amt;
        categoryIncome[t.category] = (categoryIncome[t.category] || 0) + amt;
      } else {
        totalExpense += amt;
        categoryExpense[t.category] = (categoryExpense[t.category] || 0) + amt;
      }

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expense: 0, count: 0 };
      }
      monthlyMap[monthKey][t.type] += amt;
      monthlyMap[monthKey].count++;
    }

    // Convert monthly map to sorted array
    const monthly = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        label: formatMonthLabel(month),
        ...data,
        net: data.income - data.expense,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Current month stats
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = monthlyMap[currentMonthKey] || {
      income: 0,
      expense: 0,
      count: 0,
    };

    return res.status(200).json({
      success: true,
      overall: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        transactionCount: transactions.length,
      },
      currentMonth: {
        month: currentMonthKey,
        label: formatMonthLabel(currentMonthKey),
        income: currentMonth.income,
        expense: currentMonth.expense,
        net: currentMonth.income - currentMonth.expense,
        count: currentMonth.count,
      },
      monthly,
      categoryBreakdown: {
        income: categoryIncome,
        expense: categoryExpense,
      },
    });
  } catch (error) {
    console.error("[FINANCE SUMMARY] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === "unknown") return "Unknown";
  const [year, month] = monthKey.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}
