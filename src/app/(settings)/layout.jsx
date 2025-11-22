'use client';

import Header from "../../components/Header";
import SideNav from "../../components/SideNav";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen overflow-hidden">
          <SideNav />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
