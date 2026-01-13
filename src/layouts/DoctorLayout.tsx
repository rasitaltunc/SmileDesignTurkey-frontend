import React from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function DoctorLayout() {
  // ✅ ALL HOOKS FIRST - never after conditional returns
  const { pathname } = useLocation();
  const { user, role, isLoading } = useAuthStore();

  const tabClass = (active: boolean) =>
    `px-3 py-1 rounded border ${active ? "bg-gray-100" : "bg-white hover:bg-gray-50"}`;

  // ✅ Auth checks AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  if (role !== "doctor") {
    return <Navigate to="/" replace />;
  }

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

