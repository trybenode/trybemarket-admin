"use client";
import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import EditSchoolModal from "@/components/EditSchoolModal";
import { useParams, useRouter } from "next/navigation";
import { getSchoolById, deleteSchool, formatDate, getSchoolUsers } from "@/utils/schoolManagement";

function Page() {
  const { id } = useParams();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersLimit, setUsersLimit] = useState(10);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadSchool();
  }, [id]);

  useEffect(() => {
    if (school) {
      loadUsers();
    }
  }, [usersLimit]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await getSchoolUsers(id, usersLimit);
      setSchool(prev => ({ ...prev, usersData: users }));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSchool = async () => {
    try {
      setLoading(true);
      const data = await getSchoolById(id);
      setSchool(data);
    } catch (error) {
      console.error('Error loading school:', error);
      alert('Failed to load school details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchool = async (updatedData) => {
    try {
      // Reload school data
      await loadSchool();
      alert('School updated successfully!');
    } catch (error) {
      console.error('Error updating school:', error);
      alert('Failed to update school');
    }
  };

  const handleDeleteSchool = async () => {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteSchool(id);
      alert('School deleted successfully!');
      router.push('/school_management/schools');
    } catch (error) {
      console.error('Error deleting school:', error);
      alert(error.message || 'Failed to delete school');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">School not found</h3>
        <button 
          onClick={() => router.push('/school_management/schools')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Schools
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
        <PageHeader
          HeaderText={school.name}
          SubHeaderText={`School ID: ${id} • ${school.status}`}
        />

      {/* Stats Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{school.users}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{school.activeProducts}</p>
              <p className="text-sm text-gray-600">Total Products</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{school.activeServices}</p>
              <p className="text-sm text-gray-600">Total Services</p>
            </div>
          </div>
        </div>

      {/* School Information and Admin Contact */}
        {/* School Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            School Information
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">School Name</p>
              <p className="text-sm text-gray-900">{school.name}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Location</p>
              <p className="text-sm text-gray-900">{school.location}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
              <p className="text-sm text-gray-900">{school.email}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">School Type</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {school.type}
              </span>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                school.status === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {school.status}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Date Joined</p>
              <p className="text-sm text-gray-900">{formatDate(school.dateJoined)}</p>
            </div>
          </div>
        </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            School Users
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show:</span>
            <select
              value={usersLimit}
              onChange={(e) => setUsersLimit(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {school.usersData && school.usersData.length > 0 ? (
                  school.usersData.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-indigo-600">
                              {(user.fullName || user.displayName || user.email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-gray-900 font-medium">{user.fullName || user.displayName || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {user.role || user.accountType || 'Student'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' || user.isActive
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status || (user.isActive ? 'Active' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                      No users found in this school
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {school.usersData?.length || 0} of {school.users} users
          </span>
          {school.usersData?.length < school.users && (
            <span className="text-indigo-600">
              Select a higher limit to view more users
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="font-medium">Edit School</span>
        </button>
        <button className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium">Generate Report</span>
        </button>
        <button className="flex items-center gap-2 px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors" onClick={handleDeleteSchool}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="font-medium">Delete School</span>
        </button>
      </div>

      {/* Edit School Modal */}
      <EditSchoolModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        school={school}
        onSave={handleSaveSchool}
      />
    </div>
  );
}

export default Page;
