import { RefreshCw, LogOut } from 'lucide-react';

type LeadTab = 'all' | 'unassigned' | 'due_today' | 'appointment_set' | 'deposit_paid';

interface LeadsFiltersProps {
  tab: LeadTab;
  onTabChange: (tab: LeadTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  leadsCount: number;
  isAdmin: boolean;
  userId?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  searchRef: React.RefObject<HTMLInputElement>;
}

export default function LeadsFilters({
  tab,
  onTabChange,
  searchQuery,
  onSearchChange,
  leadsCount,
  isAdmin,
  userId,
  isLoading,
  onRefresh,
  onLogout,
  searchRef,
}: LeadsFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-600 mt-1">
            <span className="font-medium">{leadsCount} leads</span>
            <span className="ml-3 text-xs text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">/</kbd> to search
            </span>
            {!isAdmin && userId && (
              <span className="ml-2 text-blue-600">• Assigned to: {userId}</span>
            )}
            {isAdmin && <span className="ml-2 text-green-600">• Admin Mode</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search leads... (Press / to focus)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(isAdmin
          ? [
              ['all', 'All'],
              ['unassigned', 'Unassigned'],
              ['due_today', 'Due Today'],
              ['appointment_set', 'Appointment'],
              ['deposit_paid', 'Deposit Paid'],
            ]
          : [
              ['all', 'All'],
              ['due_today', 'Due Today'],
              ['appointment_set', 'Appointment'],
              ['deposit_paid', 'Deposit Paid'],
            ]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onTabChange(key as LeadTab)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              tab === key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}



