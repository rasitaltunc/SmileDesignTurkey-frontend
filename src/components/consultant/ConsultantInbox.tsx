/**
 * ConsultantInbox - AI-Prioritized Patient Queue
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 * 
 * CREATIVE VERSION:
 * Not just "show messages" but "guide consultant to success"
 * Priority queue with emotional insights, SLA tracking, gamification
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Inbox,
    RefreshCw,
    Clock,
    Zap,
    TrendingUp,
    Award,
    AlertCircle,
    Search,
    Filter,
    DollarSign,
} from 'lucide-react';
import {
    getConsultantInbox,
    getConsultantStats,
    type ConsultantConversation,
    type ConsultantStats,
} from '@/lib/consultant/consultantService';
import PatientCardCompact from './PatientCardCompact';
import ConsultantStatsPanel from './ConsultantStatsPanel';

interface ConsultantInboxProps {
    consultantId: string;
    onSelectConversation: (conversation: ConsultantConversation) => void;
    selectedConversationId?: string;
}

export default function ConsultantInbox({
    consultantId,
    onSelectConversation,
    selectedConversationId,
}: ConsultantInboxProps) {
    const [conversations, setConversations] = useState<ConsultantConversation[]>([]);
    const [stats, setStats] = useState<ConsultantStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');

    const loadData = useCallback(async () => {
        try {
            const [inboxData, statsData] = await Promise.all([
                getConsultantInbox(consultantId),
                getConsultantStats(consultantId),
            ]);
            setConversations(inboxData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load inbox:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [consultantId]);

    useEffect(() => {
        loadData();

        // Auto-refresh every 15 seconds
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
    };

    // Filter conversations
    const filteredConversations = conversations.filter(conv => {
        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            if (!conv.patientFirstName.toLowerCase().includes(searchLower) &&
                !conv.lastMessage.toLowerCase().includes(searchLower)) {
                return false;
            }
        }

        // Priority filter
        if (priorityFilter !== 'all' && conv.priority !== priorityFilter) {
            return false;
        }

        return true;
    });

    // Group by priority for visual organization
    const urgentConversations = filteredConversations.filter(c => c.priority === 'urgent');
    const highConversations = filteredConversations.filter(c => c.priority === 'high');
    const mediumConversations = filteredConversations.filter(c => c.priority === 'medium');
    const lowConversations = filteredConversations.filter(c => c.priority === 'low');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your inbox...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-purple-50">
            {/* Header with Stats */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                {/* Main header */}
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                                <Inbox className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Patient Queue</h1>
                                <p className="text-sm text-gray-500">
                                    {conversations.length} patients waiting • AI-prioritized
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Quick stats */}
                            {stats && (
                                <div className="hidden md:flex items-center gap-4 mr-4">
                                    <div className="flex items-center gap-1 text-sm">
                                        <DollarSign className="w-4 h-4 text-green-600" />
                                        <span className="font-semibold text-green-600">€{stats.todayEarnings}</span>
                                        <span className="text-gray-500">today</span>
                                    </div>
                                    {stats.currentStreak > 0 && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                            <span>🔥</span>
                                            <span>{stats.currentStreak} streak!</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats panel (collapsible on mobile) */}
                {stats && <ConsultantStatsPanel stats={stats} />}

                {/* Search and filters */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All priorities</option>
                            <option value="urgent">🔴 Urgent</option>
                            <option value="high">🟠 High</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                        <Inbox className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="font-medium">No patients in queue</p>
                        <p className="text-sm">New messages will appear here</p>
                    </div>
                ) : (
                    <>
                        {/* Urgent section */}
                        {urgentConversations.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                                        Urgent ({urgentConversations.length})
                                    </span>
                                </div>
                                {urgentConversations.map(conv => (
                                    <PatientCardCompact
                                        key={conv.id}
                                        conversation={conv}
                                        isSelected={selectedConversationId === conv.id}
                                        onClick={() => onSelectConversation(conv)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* High priority section */}
                        {highConversations.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                                        High Priority ({highConversations.length})
                                    </span>
                                </div>
                                {highConversations.map(conv => (
                                    <PatientCardCompact
                                        key={conv.id}
                                        conversation={conv}
                                        isSelected={selectedConversationId === conv.id}
                                        onClick={() => onSelectConversation(conv)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Medium priority section */}
                        {mediumConversations.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">
                                        Medium ({mediumConversations.length})
                                    </span>
                                </div>
                                {mediumConversations.map(conv => (
                                    <PatientCardCompact
                                        key={conv.id}
                                        conversation={conv}
                                        isSelected={selectedConversationId === conv.id}
                                        onClick={() => onSelectConversation(conv)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Low priority section */}
                        {lowConversations.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                                        Low Priority ({lowConversations.length})
                                    </span>
                                </div>
                                {lowConversations.map(conv => (
                                    <PatientCardCompact
                                        key={conv.id}
                                        conversation={conv}
                                        isSelected={selectedConversationId === conv.id}
                                        onClick={() => onSelectConversation(conv)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
