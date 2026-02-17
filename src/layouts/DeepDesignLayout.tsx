import React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AmbientBackground } from "../components/hub/AmbientBackground";
import {
    Activity,
    Settings,
    Users,
    MessageSquare,
    Calendar,
    LogOut,
    Menu,
    X
} from "lucide-react";
import '../styles/hub.css'; // Reuse hub styles for glassmorphism
import { useAuthStore } from "@/store/authStore";

export default function DeepDesignLayout() {
    const { logout } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100 font-sans">
            {/* 1. Atmospheric Background (Doctor Variant) */}
            <AmbientBackground variant="doctor" />

            {/* 2. Main Layout Grid */}
            <div className="relative z-10 flex h-full p-4 gap-4">

                {/* ── Sidebar (Glass Panel) ── */}
                <aside className="hidden lg:flex w-72 flex-col rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-bold text-white text-lg tracking-tight">SmileOS</h1>
                                <p className="text-xs text-slate-400 font-medium tracking-wider">COMMAND CENTER</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        <NavItem to="/doctor" icon={<Activity />} label="Triage & Focus" end />
                        <NavItem to="/doctor/patients" icon={<Users />} label="Patient Database" />
                        <NavItem to="/doctor/messages" icon={<MessageSquare />} label="Consultations" badge="3" />
                        <NavItem to="/doctor/schedule" icon={<Calendar />} label="Surgery Schedule" />
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 space-y-1">
                        <NavItem to="/doctor/settings" icon={<Settings />} label="System Settings" />
                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 group"
                        >
                            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* ── Main Content Area (Glass Panel) ── */}
                <main className="flex-1 flex flex-col min-w-0 rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden relative">

                    {/* Mobile Header (Visible only on small screens) */}
                    <div className="lg:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400">
                                <Activity className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-white">SmileOS</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>

                    {/* Mobile Menu Overlay */}
                    {isMobileMenuOpen && (
                        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl p-4 flex flex-col gap-2">
                            <div className="flex justify-end mb-4">
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <NavItem to="/doctor" icon={<Activity />} label="Triage & Focus" end onClick={() => setIsMobileMenuOpen(false)} />
                            <NavItem to="/doctor/patients" icon={<Users />} label="Patient Database" onClick={() => setIsMobileMenuOpen(false)} />
                            <NavItem to="/doctor/messages" icon={<MessageSquare />} label="Consultations" onClick={() => setIsMobileMenuOpen(false)} />
                            <NavItem to="/doctor/schedule" icon={<Calendar />} label="Surgery Schedule" onClick={() => setIsMobileMenuOpen(false)} />
                            <NavItem to="/doctor/settings" icon={<Settings />} label="Settings" onClick={() => setIsMobileMenuOpen(false)} />
                        </div>
                    )}

                    {/* Scrollable Content Container */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <div className="min-h-full p-4 lg:p-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// Helper Component for Navigation Items
function NavItem({ to, icon, label, end, badge, onClick }: any) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                    ? "bg-teal-500/20 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.1)] border border-teal-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <span className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                        {React.cloneElement(icon, { size: 20 })}
                    </span>
                    <span className="font-medium tracking-wide">{label}</span>
                    {badge && (
                        <span className="ml-auto bg-teal-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.4)]">
                            {badge}
                        </span>
                    )}
                    {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-500 rounded-r-full shadow-[0_0_10px_#14b8a6]" />
                    )}
                </>
            )}
        </NavLink>
    );
}
