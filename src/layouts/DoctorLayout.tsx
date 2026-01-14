import React from "react";
import { Link, NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function DoctorLayout() {
  // ✅ ALL HOOKS FIRST - never after conditional returns
  const { pathname } = useLocation();
  const { user, role, isLoading } = useAuthStore();

  // ✅ Auth checks AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  if ((role || "").toLowerCase() !== "doctor") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/doctor" className="font-semibold text-gray-900 hover:text-teal-600 transition-colors">
            GuideHealth
          </Link>
          <nav className="flex gap-2">
            <NavLink
              to="/doctor"
              end
              className={({ isActive }) =>
                "px-3 py-2 rounded-lg text-sm font-semibold transition-colors " +
                (isActive ? "bg-teal-600 text-white" : "text-gray-700 hover:bg-gray-100")
              }
            >
              Inbox
            </NavLink>
            <NavLink
              to="/doctor/settings"
              className={({ isActive }) =>
                "px-3 py-2 rounded-lg text-sm font-semibold transition-colors " +
                (isActive ? "bg-teal-600 text-white" : "text-gray-700 hover:bg-gray-100")
              }
            >
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

