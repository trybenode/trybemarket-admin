"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "./PageHeader";
import { createAdmin, updateAdmin } from "@/utils/adminActions";
import { roles, allPermissions } from "@/utils/adminConstants";

export default function CreateEditAdminModal({
  isOpen,
  onClose,
  adminData,
  refreshList,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    permissions: [],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (adminData) {
      setForm({
        name: adminData.name || "",
        email: adminData.email || "",
        password: "",
        role: adminData.role || "admin",
        permissions: adminData.permissions || [],   
      });
    } else {
      setForm({
        name: "",
        email: "",
        password: "",
        role: "admin",
        permissions: [],
      });
    }
  }, [adminData]);

  const updateForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const togglePermission = (perm) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = async () => {
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      if (adminData) {
        await updateAdmin(adminData.AdminUid, {
          name: form.name,
          role: form.role,
          permissions: form.permissions,
        });
      } else {
        await createAdmin(form);
      }

      setMessage({
        type: "success",
        text: adminData ? "Admin updated!" : "Admin created successfully!",
      });

      setForm({
        name: "",
        email: "",
        password: "",
        role: "admin",
        permissions: [],
      });

      await refreshList();
      onClose();
    } catch (error) {
      console.error("Admin error:", error);
      setMessage({ type: "error", text: error.message });
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center p-2 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
        <PageHeader
          HeaderText={adminData ? "Edit Admin" : "Create New Admin"}
          SubHeaderText="Set role, permissions, and credentials for the admin."
        />

        {message.text && (
          <div
            className={`p-3 mb-4 rounded ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-2 border rounded-lg"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
          />

          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-2 border rounded-lg"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            disabled={!!adminData}
          />

          {!adminData && (
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)}
            />
          )}

          <select
            className="w-full px-4 py-2 border rounded-lg"
            value={form.role}
            onChange={(e) => updateForm("role", e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <div>
            <p className="text-sm font-semibold mb-2">Permissions</p>
            <div className="grid grid-cols-2 gap-2">
              {allPermissions.map((perm) => (
                <label key={perm} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            {loading
              ? "Processing..."
              : adminData
              ? "Save Changes"
              : "Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
