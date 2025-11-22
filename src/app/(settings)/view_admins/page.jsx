'use client'
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { getAllAdmins, deleteAdmin } from '@/utils/adminActions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateEditAdminModal from '@/components/CreateEditAdminModal';

function AdminManagementPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Load admins from Firestore
  useEffect(() => {
    async function loadAdmins() {
      const data = await getAllAdmins();
      setAdmins(data);
    }
    loadAdmins();
  }, []);

  const handleAdd = () => {
    setSelectedAdmin(null);
    setIsModalOpen(true);
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = async (adminId) => {
    const confirmDelete = confirm('Are you sure you want to delete this admin?');
    if (!confirmDelete) return;

    await deleteAdmin(adminId);
    setAdmins(admins.filter((a) => a.uid !== adminId));
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        HeaderText="Admin Management"
        SubHeaderText="Create, edit, and manage system administrators and their permissions."
      />

      {/* Search + Add */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">

          {/* Search Bar */}
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Search admins..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Add New Admin */}
          {/* <Link href="/create_admins"> */}
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
            <span className="font-medium">Add Admin</span>
          </button>
              {/* </Link> */}
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">Admin</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">Permissions</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.AdminUid} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-700 font-semibold">
                        {admin.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{admin.name}</p>
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">{admin.role}</td>

                <td className="px-6 py-4">
                  <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">
                    {admin.permissions?.length} permissions
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {/* Edit */}
                    <button 
                      className="p-2 hover:bg-indigo-50 rounded-lg"
                      onClick={() => handleEdit(admin)}
                    >
                      ✏️
                    </button>

                    {/* Delete */}
                    <button 
                      className="p-2 hover:bg-red-50 rounded-lg"
                      onClick={() => handleDelete(admin.uid)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      <CreateEditAdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        adminData={selectedAdmin}
        refreshList={async () => {
          const data = await getAllAdmins();
          setAdmins(data);
        }}
      />
    </div>
  );
}

export default AdminManagementPage;
