import * as React from 'react';
import {
    Activity,
    Users,
    Calendar,
    Clock,
    AlertCircle,
    Shield,
    Search,
    Stethoscope,
    ChevronRight,
    ArrowUpRight
} from 'lucide-react';
import SmartClinicalReview from './SmartClinicalReview';

interface DoctorDashboardProps {
    doctorName?: string;
    metrics?: {
        pendingReviews: number;
        urgentCases: number;
        todaySurgeries: number;
        revenueThisMonth: number;
    };
    recentLeads?: any[];
    onNavigate?: (path: string) => void;
}

export default function DoctorDashboard({
    doctorName = "Dr. Emre",
    metrics = {
        pendingReviews: 12,
        urgentCases: 3,
        todaySurgeries: 4,
        revenueThisMonth: 145000
    },
    recentLeads = [],
    onNavigate = () => { }
}: DoctorDashboardProps) {

    const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);

    // Use recentLeads if provided, otherwise fallback to mock urgentCases for demo
    const displayCases = recentLeads.length > 0 ? recentLeads.map(l => ({
        id: l.ref || l.id,
        name: l.name,
        issue: l.treatment || 'Consultation',
        time: l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        status: l.doctor_review_status || 'pending',
        ...l
    })) : [
        { id: 1, name: "Sarah Connor", issue: "Full Mouth Rehab", time: "10m ago", status: "awaiting_approval" },
        { id: 2, name: "John Wick", issue: "Zirconia Crowns", time: "1h ago", status: "needs_xray" },
        { id: 3, name: "Bruce Wayne", issue: "Implant Inquiry", time: "2h ago", status: "high_value" }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Top Navigation / Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        <span className="text-lg font-bold text-slate-900 tracking-tight hidden md:inline">Clinical Command</span>
                        <span className="text-lg font-bold text-slate-900 tracking-tight md:hidden">SmileOS</span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="relative hidden md:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search patient ID..."
                                className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm border-none focus:ring-2 focus:ring-teal-500 w-64 transition-all"
                            />
                        </div>
                        <button className="p-2 text-slate-500 md:hidden">
                            <Search className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-slate-200">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-slate-900">{doctorName}</p>
                                <p className="text-xs text-slate-500 flex items-center justify-end gap-1">
                                    <Shield className="w-3 h-3 text-green-600" /> Authorized
                                </p>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Emre" alt="Profile" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
                {/* 1. KPI Cards (The Pulse) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div
                        onClick={() => setSelectedPatient({ name: "Demo Patient", id: "CASE-DEMO", photos: [] })}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-teal-200 transition-all group cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: '0ms' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-teal-50 rounded-xl group-hover:bg-teal-100 transition-colors">
                                <FileTextIcon className="w-6 h-6 text-teal-600" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
                                Needs Action
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-1">{metrics.pendingReviews}</h3>
                        <p className="text-sm text-slate-500">Pending Lead Reviews</p>
                    </div>

                    <div
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-200 transition-all group cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: '100ms' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors">
                                <AlertCircle className="w-6 h-6 text-rose-600 animate-pulse" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                                Priority
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-1">{metrics.urgentCases}</h3>
                        <p className="text-sm text-slate-500">Urgent Consultations</p>
                    </div>

                    <div
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all group cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: '200ms' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                Today
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-1">{metrics.todaySurgeries}</h3>
                        <p className="text-sm text-slate-500">Surgeries Scheduled</p>
                    </div>

                    <div
                        className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 text-white relative overflow-hidden group animate-fade-in-up"
                        style={{ animationDelay: '300ms' }}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-slate-400 text-sm font-medium mb-1">Clinic Performance</p>
                            <h3 className="text-2xl font-bold text-white mb-4">€{metrics.revenueThisMonth.toLocaleString()}</h3>
                            <div className="flex items-center gap-2 text-xs text-emerald-400">
                                <ArrowUpRight className="w-4 h-4" />
                                <span>+12% vs last month</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Main Work Area (Triage & Schedule) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Triage Board (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-500" />
                                Urgent Triage
                            </h2>
                            <button className="text-sm text-teal-600 font-medium hover:underline">View All Leads</button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {displayCases.map((patient, index) => (
                                <div
                                    key={patient.id}
                                    onClick={() => onNavigate ? onNavigate(`/doctor/lead/${patient.id || patient.ref}`) : setSelectedPatient(patient)}
                                    className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${index !== displayCases.length - 1 ? 'border-b border-slate-100' : ''}`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-900 truncate">{patient.name}</h4>
                                            <p className="text-sm text-slate-500 truncate">{patient.issue}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                        <div className="text-right">
                                            <span className="block text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full mb-1 whitespace-nowrap">
                                                {patient.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">{patient.time}</span>
                                        </div>
                                        <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI Insight Box */}
                        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm">
                                <Activity className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg">AI Clinical Insight</h3>
                                <p className="text-indigo-700 text-sm mt-1 leading-relaxed">
                                    Based on recent trends, <strong>Zirconia Crown</strong> inquiries have increased by 40%.
                                    I've prepared 3 new "Smile Makeover" template responses for your approval to speed up the triage process.
                                </p>
                                <button className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                    Review Templates →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Surgery Schedule (1/3) */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" />
                            Today's Schedule
                        </h2>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
                            {/* Timeline Item 1 */}
                            <div className="flex gap-4 relative">
                                <div className="flex flex-col items-center">
                                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                    <div className="w-0.5 h-full bg-slate-100 my-1"></div>
                                </div>
                                <div className="pb-4">
                                    <span className="text-xs font-bold text-slate-400">09:00 AM</span>
                                    <h4 className="font-bold text-slate-900">Dr. Emre - Surgery</h4>
                                    <p className="text-sm text-slate-500">Full Mouth Implants (All-on-6)</p>
                                </div>
                            </div>

                            {/* Timeline Item 2 (Active) */}
                            <div className="flex gap-4 relative">
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-3 bg-green-500 rounded-full ring-4 ring-green-100"></div>
                                    <div className="w-0.5 h-full bg-slate-100 my-1"></div>
                                </div>
                                <div className="pb-4">
                                    <span className="text-xs font-bold text-green-600">NOW (11:30 AM)</span>
                                    <h4 className="font-bold text-slate-900">Consultation</h4>
                                    <p className="text-sm text-slate-500">Virtual Assessment - Case #342</p>
                                </div>
                            </div>

                            {/* Timeline Item 3 */}
                            <div className="flex gap-4 relative">
                                <div className="flex flex-col items-center">
                                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                    {/* <div className="w-0.5 h-full bg-slate-100 my-1"></div> */}
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400">02:00 PM</span>
                                    <h4 className="font-bold text-slate-900">Team Review</h4>
                                    <p className="text-sm text-slate-500">Weekly Clinical Board</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* Smart Clinical Review Modal */}
            {selectedPatient && (
                <SmartClinicalReview
                    patientName={selectedPatient.name}
                    patientId={selectedPatient.ref || selectedPatient.id || "CASE-UNKNOWN"}
                    onClose={() => setSelectedPatient(null)}
                />
            )}
        </div>
    );
}

// Icon Helper
function FileTextIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
    );
}
