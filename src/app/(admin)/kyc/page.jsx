'use client'
import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";

function Page() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Sample KYC requests data - replace with actual API data
  const [kycRequests, setKycRequests] = useState([
    { 
      id: 1, 
      userName: 'John Doe',
      email: 'john.doe@springfield.edu',
      phoneNumber: '+1 (555) 123-4567',
      schoolName: 'Springfield Elementary',
      status: 'Pending', 
      submittedDate: 'Nov 18, 2025',
      schoolIdImage: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=School+ID+Image' // Cloudinary URL placeholder
    },
    { 
      id: 2, 
      userName: 'Jane Smith',
      email: 'jane.smith@riverside.edu',
      phoneNumber: '+1 (555) 987-6543',
      schoolName: 'Riverside High School',
      status: 'Approved', 
      submittedDate: 'Nov 15, 2025',
      schoolIdImage: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=School+ID+Image'
    },
    { 
      id: 3, 
      userName: 'Michael Brown',
      email: 'michael.brown@oakwood.edu',
      phoneNumber: '+1 (555) 456-7890',
      schoolName: 'Oakwood Academy',
      status: 'Pending', 
      submittedDate: 'Nov 12, 2025',
      schoolIdImage: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=School+ID+Image'
    },
    { 
      id: 4, 
      userName: 'Sarah Johnson',
      email: 'sarah.johnson@sunset.edu',
      phoneNumber: '+1 (555) 321-0987',
      schoolName: 'Sunset Middle School',
      status: 'Rejected', 
      submittedDate: 'Nov 10, 2025',
      schoolIdImage: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=School+ID+Image'
    },
    { 
      id: 5, 
      userName: 'David Wilson',
      email: 'david.wilson@lincoln.edu',
      phoneNumber: '+1 (555) 654-3210',
      schoolName: 'Lincoln Technical Institute',
      status: 'Pending', 
      submittedDate: 'Nov 8, 2025',
      schoolIdImage: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=School+ID+Image'
    },
  ]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isViewModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isViewModalOpen]);

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleStatusChange = (requestId, newStatus) => {
    setKycRequests(kycRequests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    ));
    setIsViewModalOpen(false);
    // Here you would typically make an API call to update the status
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = filterStatus === 'all' 
    ? kycRequests 
    : kycRequests.filter(req => req.status.toLowerCase() === filterStatus);

  const stats = {
    total: kycRequests.length,
    pending: kycRequests.filter(r => r.status === 'Pending').length,
    approved: kycRequests.filter(r => r.status === 'Approved').length,
    rejected: kycRequests.filter(r => r.status === 'Rejected').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        HeaderText="KYC Management"  
        SubHeaderText="Review and manage KYC verification requests from schools"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Requests</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({stats.rejected})
          </button>
        </div>
      </div>

      {/* KYC Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  School Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Submitted Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {request.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{request.userName}</p>
                        <p className="text-xs text-gray-500">ID: {request.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm2 12v-7l7 3 7-3v7" />
                      </svg>
                      <span className="text-sm text-gray-900">{request.schoolName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{request.email}</p>
                      <p className="text-xs text-gray-500">{request.phoneNumber}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{request.submittedDate}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewRequest(request)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View/Review Modal */}
      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-indigo-50 to-white shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                KYC Request Review
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Request ID</p>
                    <p className="text-sm font-medium text-gray-900">#{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">School Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.schoolName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Submitted Date</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.submittedDate}</p>
                  </div>
                </div>
              </div>

              {/* School ID Image */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  School ID Card
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img 
                    src={selectedRequest.schoolIdImage} 
                    alt="School ID"
                    className="w-full h-auto object-contain"
                  />
                  <div className="p-3 bg-white border-t border-gray-200">
                    <a 
                      href={selectedRequest.schoolIdImage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Full Size
                    </a>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Status</h3>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            {/* Modal Footer - Action Buttons */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
              >
                Close
              </button>
              {selectedRequest.status === 'Pending' && (
                <>
                  <button
                    onClick={() => handleStatusChange(selectedRequest.id, 'Rejected')}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm text-sm flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedRequest.id, 'Approved')}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm text-sm flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Page;
