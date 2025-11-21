import React from 'react'
import Link from 'next/link'

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" />
    </svg>
  )},

  { name: 'School Management', href: '/admin/schools', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M3 7l9-4 9 4-9 4-9-4zm2 12v-7l7 3 7-3v7" />
    </svg>
  )},

  { name: 'KYC Status', href: '/admin/kyc', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" className="w-5 h-5">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M5 13l4 4L19 7" />
    </svg>
  )},

  { name: 'Report & Review', href: '/admin/reports', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" className="w-5 h-5">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  )},

  { name: 'Email Center', href: '/admin/email', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M4 4h16v16H4zM4 4l8 8 8-8" />
    </svg>
  )},

  { name: 'Delete Data', href: '/admin/delete-data', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="w-5 h-5" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M6 7h12M9 7V4h6v3m-7 4v7m4-7v7m4-7v7" />
    </svg>
  )},

  { name: 'Feedback Page', href: '/admin/feedback', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M4 4h16v12H7l-3 3V4z" />
    </svg>
  )},

  { name: 'Settings', href: '/admin/settings', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="w-5 h-5" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 014.3 17.9l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L4.3 4.3A2 2 0 017.13 1.47l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V1a2 2 0 014 0v.09c0 .644.39 1.21 1 1.51h.02a1.65 1.65 0 001.82-.33l.06-.06A2 2 0 0119.7 4.1l-.06.06a1.65 1.65 0 00-.33 1.82v.02c.31.61.97 1 1.6 1H21a2 2 0 010 4h-.09c-.63 0-1.29.39-1.6 1z" />
    </svg>
  )},
]

function SideNav({ collapsed = false }) {
  return (
    <aside className={`h-screen ${collapsed ? 'w-20' : 'w-64'} bg-gray-800 text-gray-100 flex flex-col`} aria-label="Sidebar">
      {/* <div className="flex items-center h-16 px-4 border-b border-gray-700">
        <Link href="/admin" className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-indigo-400">
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            <path d="M8 12h8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {!collapsed && <span className="font-semibold text-lg">TrybeMarket</span>}
        </Link>
      </div> */}

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link href={item.href} className="group flex items-center gap-3 p-2 rounded-md text-sm hover:bg-gray-700">
                <span className="text-gray-300">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 text-left">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7" />
          </svg>
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default SideNav
