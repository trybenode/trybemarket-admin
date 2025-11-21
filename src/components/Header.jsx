'use client';
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full h-16 px-6 bg-white border-b flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="logo"
          width={100}
          height={100}
          className="rounded-md"
        />
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2"
        >
          <Image
            src="/avatar.jpg" // replace with your profile image
            alt="profile"
            width={36}
            height={36}
            className="rounded-full border"
          />
          <span className="font-medium">Admin</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-14 right-0 w-40 bg-white shadow-md rounded-md border">
            <button className="w-full px-4 py-2 hover:bg-gray-100 text-left">
              Profile
            </button>
            <button className="w-full px-4 py-2 hover:bg-gray-100 text-left">
              Settings
            </button>
            <button className="w-full px-4 py-2 text-red-600 hover:bg-gray-100 text-left">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
