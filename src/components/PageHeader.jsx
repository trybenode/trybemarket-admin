import React from 'react'

function PageHeader({HeaderText, SubHeaderText}) {
  return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{HeaderText}</h1>
        <p className="text-gray-600">{SubHeaderText}</p>
      </div>
  )
}

export default PageHeader