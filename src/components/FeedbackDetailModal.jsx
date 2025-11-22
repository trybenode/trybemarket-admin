'use client'
import React, { useEffect } from 'react'
import { formatDate } from '@/utils/feedback'

function FeedbackDetailModal({ isOpen, onClose, feedback }) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !feedback) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-indigo-50 to-white shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Feedback Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Information Card */}
          <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              User Information
            </h3>
            
            <div className="flex items-start gap-4">
              {/* User Avatar */}
              <div className="shrink-0">
                {feedback.userProfilePicture ? (
                  <img 
                    src={feedback.userProfilePicture} 
                    alt={feedback.userName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow-md">
                    {feedback.userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Name</p>
                  <p className="text-sm font-semibold text-gray-900">{feedback.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-sm text-gray-700">{feedback.userEmail}</p>
                </div>
                {feedback.userSchool && feedback.userSchool !== 'N/A' && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">School</p>
                    <p className="text-sm text-gray-700">{feedback.userSchool}</p>
                  </div>
                )}
                {feedback.userPhone && feedback.userPhone !== 'N/A' && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                    <p className="text-sm text-gray-700">{feedback.userPhone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Content */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Feedback Title
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-900 font-medium">{feedback.title}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[120px]">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{feedback.description}</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Submitted:</span>
                <span>{formatDate(feedback.createdAt)}</span>
              </div>
              <div className="text-xs text-gray-400">
                ID: {feedback.id}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackDetailModal
