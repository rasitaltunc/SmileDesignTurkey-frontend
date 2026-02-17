/**
 * ConsultantStatsPanel - Gamification and metrics
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 * 
 * Make consultants feel appreciated and motivated!
 * Show streaks, earnings, badges, and performance
 */

import { DollarSign, Clock, Star, Zap, Award, TrendingUp } from 'lucide-react';
import type { ConsultantStats } from '@/lib/consultant/consultantService';

interface ConsultantStatsPanelProps {
    stats: ConsultantStats;
}

export default function ConsultantStatsPanel({ stats }: ConsultantStatsPanelProps) {
    return (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-purple-100">
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
                {/* Earnings */}
                <div className="flex items-center gap-2 min-w-fit">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Today's Earnings</p>
                        <p className="font-bold text-green-600">
                            €{stats.todayEarnings}
                            {stats.streakBonus > 0 && (
                                <span className="text-xs text-orange-500 ml-1">+€{stats.streakBonus} 🔥</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Response time */}
                <div className="flex items-center gap-2 min-w-fit">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Avg Response</p>
                        <p className="font-bold text-blue-600">{stats.avgResponseTimeFormatted}</p>
                    </div>
                </div>

                {/* Satisfaction */}
                <div className="flex items-center gap-2 min-w-fit">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Satisfaction</p>
                        <p className="font-bold text-yellow-600">{stats.satisfactionScore}/5 ⭐</p>
                    </div>
                </div>

                {/* Conversations */}
                <div className="flex items-center gap-2 min-w-fit">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Conversations</p>
                        <p className="font-bold text-purple-600">{stats.todayConversations} today</p>
                    </div>
                </div>

                {/* Streak (if active) */}
                {stats.currentStreak > 0 && (
                    <div className="flex items-center gap-2 min-w-fit">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Zap className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Streak</p>
                            <p className="font-bold text-orange-600">🔥 {stats.currentStreak}</p>
                        </div>
                    </div>
                )}

                {/* Badges */}
                {stats.badges.length > 0 && (
                    <div className="flex items-center gap-2 min-w-fit">
                        <div className="p-2 bg-pink-100 rounded-lg">
                            <Award className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Badges Today</p>
                            <div className="flex gap-1">
                                {stats.badges.slice(0, 3).map((badge) => (
                                    <span
                                        key={badge.id}
                                        title={`${badge.name}: ${badge.description}`}
                                        className="text-lg cursor-help"
                                    >
                                        {badge.emoji}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
