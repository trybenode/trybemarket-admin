"use client";

import React, { useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import PageHeader from "@/components/PageHeader";

export default function CreateAdminPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin",
    permissions: [],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const allPermissions = [
    "dashboard",
    "users",
    "orders",
    "products",
    "school-management",
    "kyc-status",
    "report-review",
    "email-center",
    "delete-data",
    "feedback",
    "settings",
  ];

  const roles = [
    { value: "super-admin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "support", label: "Support Staff" },
    { value: "reviewer", label: "Review Analyst" },
    { value: "operations", label: "Operations Manager" },
  ];

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  async function createAdmin(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      // 1. Create Firebase Auth User
      const user = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const uid = user.user.uid;

      // 2. Save to Firestore
      await setDoc(doc(db, "admins", uid), {
        email: form.email,
        name: form.name,
        role: form.role,
        permissions: form.permissions,
        createdAt: serverTimestamp(),
      });

      setMessage({ type: "success", text: "Admin created successfully!" });

      // Reset form
      setForm({
        email: "",
        password: "",
        name: "",
        role: "admin",
        permissions: [],
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      console.error(error);
    }

    setLoading(false);
  }

  function togglePermission(permission) {
    setForm((prev) => {
      const exists = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  }

  return (
    <div className="p-6">
        <PageHeader HeaderText="Create New Admin" SubHeaderText="Create different admins with subjugated task"/>
      <h1 className="text-2xl font-semibold mb-6"></h1>

      {message.text ? (
        <div
          className={`p-3 mb-4 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6" onSubmit={createAdmin}>
        <div>
          <label className="block mb-1 font-medium">Full Name</label>
          <input
            type="text"
            className="w-full p-2 rounded border border-gray-700"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className="w-full p-2 rounded border border-gray-700"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            className="w-full p-2 rounded border border-gray-700"
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Role</label>
          <select
            className="w-full p-2 rounded border border-gray-700"
            value={form.role}
            onChange={(e) => updateForm("role", e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">Permissions</label>
          <div className="grid grid-cols-2 gap-2">
            {allPermissions.map((perm) => (
              <label key={perm} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="h-4 w-4"
                />
                {perm}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4  py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-medium"
        >
          {loading ? "Creating..." : "Create Admin"}
        </button>
      </form>
    </div>
  );
}
