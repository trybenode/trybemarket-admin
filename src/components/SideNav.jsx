'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" />
    </svg>
  )},

  { name: 'School Management', href: '/school_management/schools', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M3 7l9-4 9 4-9 4-9-4zm2 12v-7l7 3 7-3v7" />
    </svg>
  )},

  { name: 'KYC Status', href: '/kyc', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" className="w-5 h-5">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M5 13l4 4L19 7" />
    </svg>
  )},

  { name: 'Report & Review', href: '/reports', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" className="w-5 h-5">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  )},

  { name: 'Email Center', href: '/email', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M4 4h16v16H4zM4 4l8 8 8-8" />
    </svg>
  )},

  { name: 'Delete Data', href: '/delete-data', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="w-5 h-5" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M6 7h12M9 7V4h6v3m-7 4v7m4-7v7m4-7v7" />
    </svg>
  )},

  { name: 'Feedback Page', href: '/feedback', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M4 4h16v12H7l-3 3V4z" />
    </svg>
  )},

  { name: 'Settings', href: '/settings', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="w-5 h-5" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 014.3 17.9l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L4.3 4.3A2 2 0 017.13 1.47l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V1a2 2 0 014 0v.09c0 .644.39 1.21 1 1.51h.02a1.65 1.65 0 001.82-.33l.06-.06A2 2 0 0119.7 4.1l-.06.06a1.65 1.65 0 00-.33 1.82v.02c.31.61.97 1 1.6 1H21a2 2 0 010 4h-.09c-.63 0-1.29.39-1.6 1z" />
    </svg>
  )},
]

function SideNav({ collapsed = false }) {
  const pathname = usePathname()
  
  return (
    <aside 
      className={`h-screen w-20 lg:w-64 bg-gray-950 text-gray-100 flex flex-col shadow-2xl border-r border-gray-800`} 
      aria-label="Sidebar"
    >
      {/* Admin Profile Section */}
      <div className="px-4 py-6 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
            AD
          </div>
          <div className="hidden lg:block">
            <h3 className="text-lg font-bold text-white">Admin</h3>
            <p className="text-xs text-gray-400">admin@trybemarket.com</p>
          </div>
        </div>
      </div>
    
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link 
                  href={item.href} 
                  className={`group flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/50' 
                      : 'border-transparent hover:bg-white/10 hover:backdrop-blur-sm hover:border-white/10 hover:shadow-lg hover:shadow-indigo-500/10'
                  }`}
                >
                  <span className={`transition-colors ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-400'
                  }`}>{item.icon}</span>
                  <span className={`truncate transition-colors hidden lg:inline ${
                    isActive ? 'text-white font-semibold' : 'text-gray-300 group-hover:text-white'
                  }`}>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

    </aside>
  )
}

export default SideNav
