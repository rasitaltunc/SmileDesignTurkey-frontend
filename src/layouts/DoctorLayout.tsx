import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function DoctorLayout() {
  const { pathname } = useLocation();

  const tabClass = (active: boolean) =>
    `px-3 py-1 rounded border ${active ? "bg-gray-100" : "bg-white hover:bg-gray-50"}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/doctor" className="font-semibold text-sky-700">
            GuideHealth
          </Link>

          <nav className="flex items-center gap-2">
            <Link to="/doctor" className={tabClass(pathname === "/doctor")}>
              Inbox
            </Link>
            <Link
              to="/doctor/settings"
              className={tabClass(pathname.startsWith("/doctor/settings"))}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

