'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/PageHeader'
import EditSchoolModal from '@/components/EditSchoolModal'
import AddSchoolModal from '@/components/AddSchoolModal'
import { useRouter } from 'next/navigation'
import { getAllSchools, searchSchools, deleteSchool } from '@/utils/schoolManagement'

function Page() {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Load schools on mount
  useEffect(() => {
    loadSchools()
  }, [])

  const loadSchools = async () => {
    try {
      setLoading(true)
      const data = await getAllSchools()
      setSchools(data)
    } catch (error) {
      console.error('Error loading schools:', error)
      alert('Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (term) => {
    setSearchTerm(term)
    if (!term.trim()) {
      loadSchools()
      return
    }

    try {
      setIsSearching(true)
      const results = await searchSchools(term)
      setSchools(results)
    } catch (error) {
      console.error('Error searching schools:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleEditClick = (school) => {
    setSelectedSchool(school)
    setIsEditModalOpen(true)
  }

  const handleSaveSchool = async (updatedData) => {
    try {
      // Reload schools to get updated data
      await loadSchools()
      alert('School updated successfully!')
    } catch (error) {
      console.error('Error updating school:', error)
      alert('Failed to update school')
    }
  }

  const handleDeleteSchool = async (schoolId) => {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return
    }

    try {
      await deleteSchool(schoolId)
      setSchools(schools.filter(school => school.id !== schoolId))
      alert('School deleted successfully!')
    } catch (error) {
      console.error('Error deleting school:', error)
      alert(error.message || 'Failed to delete school')
    }
  }

  const handleAddSchool = async (newSchool) => {
    try {
      await loadSchools()
      alert('School added successfully!')
    } catch (error) {
      console.error('Error after adding school:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        HeaderText="School Management" 
        SubHeaderText="Manage schools, monitor activity, and track performance across your platform."
      />

      {/* Search, Filter and Add School Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Bar */}
          <div className="flex-1 w-full">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Filter Button */}
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-medium text-gray-700">Filter</span>
          </button>

          {/* Add New School Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Add School</span>
          </button>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No schools found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new school.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    School Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Users
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schools.map((school) => (
                <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm2 12v-7l7 3 7-3v7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{school.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{school.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-600 line-clamp-2">{school.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">{school.users}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      school.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {school.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group" title="View" onClick={() => router.push(`/school_management/view-school/${school.id}`)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group" title="Edit" onClick={() => handleEditClick(school)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors group" title="Delete" onClick={() => handleDeleteSchool(school.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 group-hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && schools.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{schools.length}</span> of <span className="font-medium">{schools.length}</span> schools
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Previous
              </button>
              <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit School Modal */}
      <EditSchoolModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        school={selectedSchool}
        onSave={handleSaveSchool}
      />

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSchool}
      />
    </div>
  )
}

export default Page