'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/PageHeader'
import FeedbackDetailModal from '@/components/FeedbackDetailModal'
import { getAllFeedback, getFeedbackById, formatDate } from '@/utils/feedback'

function Page() {
  const [feedbackList, setFeedbackList] = useState([])
  const [filteredFeedback, setFilteredFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Fetch all feedback on mount
  useEffect(() => {
    fetchFeedback()
  }, [])

  // Filter feedback based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFeedback(feedbackList)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = feedbackList.filter(feedback => 
        feedback.title.toLowerCase().includes(term) ||
        feedback.userName.toLowerCase().includes(term) ||
        feedback.userEmail.toLowerCase().includes(term) ||
        feedback.description.toLowerCase().includes(term)
      )
      setFilteredFeedback(filtered)
    }
  }, [searchTerm, feedbackList])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const data = await getAllFeedback()
      setFeedbackList(data)
      setFilteredFeedback(data)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedbackClick = async (feedbackId) => {
    try {
      setLoadingDetail(true)
      const feedbackDetail = await getFeedbackById(feedbackId)
      setSelectedFeedback(feedbackDetail)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error fetching feedback detail:', error)
      alert('Failed to load feedback details')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedFeedback(null)
  }

  return (
    <div className='space-y-6'>
      <PageHeader HeaderText="Feedback" SubHeaderText="View and manage user feedback"/>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header with Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">All Feedback</h2>
              <p className="text-sm text-gray-500 mt-1">
                {loading ? 'Loading...' : `${filteredFeedback.length} feedback(s) found`}
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by title, user, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-16 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No feedback found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Feedback will appear here once users submit them'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeedback.map((feedback) => (
                  <tr 
                    key={feedback.id}
                    onClick={() => handleFeedbackClick(feedback.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {feedback.userProfilePicture ? (
                          <img 
                            src={feedback.userProfilePicture} 
                            alt={feedback.userName}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {feedback.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{feedback.userName}</p>
                          <p className="text-xs text-gray-500">{feedback.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{feedback.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-md">
                        {feedback.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(feedback.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFeedbackClick(feedback.id)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Feedback Detail Modal */}
      <FeedbackDetailModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        feedback={selectedFeedback}
      />

      {/* Loading overlay for modal */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  )
}

export default Page