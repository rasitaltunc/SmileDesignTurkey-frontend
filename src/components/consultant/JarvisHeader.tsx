import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, Activity, Moon, Sun, Zap, Coffee } from 'lucide-react';
import { useConsultant } from '../../context/ConsultantContext';
import { ClinicPulseWidget } from '../dashboard/ClinicPulseWidget';
import { SleepModeIndicator } from '../dashboard/SleepModeIndicator';

export const JarvisHeader = () => {
    const { isSleepMode, toggleSleepMode, impactScore, rank } = useConsultant();
    const [greeting, setGreeting] = useState('');
    const [icon, setIcon] = useState<any>(Sun);
    const [motivation, setMotivation] = useState('');
    const [tickerIndex, setTickerIndex] = useState(0);

    const moodTickerMessages = [
        "System Status: All Systems Nominal",
        "Motivational: Smile, they can hear it",
        "Focus: 3 High-Value Leads waiting",
        "Reminder: Empathy is your best tool",
        "Trust the process.",
        "Your empathy is your superpower.",
        "Slow down to speed up."
    ];

    useEffect(() => {
        // Dynamic Greeting Logic
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good Morning');
            setIcon(Coffee);
        } else if (hour < 18) {
            setGreeting('Good Afternoon');
            setIcon(Sun);
        } else {
            setGreeting('Good Evening');
            setIcon(Moon);
        }

        // Ticker Logic
        const interval = setInterval(() => {
            setTickerIndex((prev: number) => (prev + 1) % moodTickerMessages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setMotivation(moodTickerMessages[tickerIndex]);
    }, [tickerIndex]);

    return (
        <div
            className="relative overflow-hidden mb-6 rounded-2xl p-6 text-white shadow-2xl transition-all duration-500 hover:shadow-purple-500/20 group bg-gray-900"
            style={{ backgroundColor: '#0f172a' }} // Fallback slate-900
        >
            {/* Animated Living Background */}
            <div
                className="absolute inset-0 animate-gradient-x opacity-90 group-hover:opacity-100 transition-opacity"
                style={{
                    background: 'linear-gradient(to right, #4c1d95, #3730a3, #1e3a8a)', // purple-900, indigo-800, blue-900
                    backgroundSize: '200% 200%'
                }}
            />

            {/* Glass Overlay with Noise Texture */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />

            {/* Glowing Orbs for "Living" Feel */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-20 -right-20 w-64 h-64 bg-purple-400 rounded-full blur-[100px] mix-blend-overlay"
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 6, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px] mix-blend-overlay"
            />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">

                {/* Greeting Section */}
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-white/80 text-sm font-medium tracking-wide uppercase mb-1"
                    >
                        {(() => {
                            const IconComponent = icon;
                            return <IconComponent className="w-4 h-4" />;
                        })()}
                        <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </motion.div>

                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">Consultant</span>
                    </h1>
                </div>

                {/* Right Side: Iron Man Actions */}
                <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto flex items-center gap-4">
                    {/* Clinic Pulse Widget (Inventory Aware Psychology) */}
                    <ClinicPulseWidget />

                    {/* Sleep Mode Indicator (Active State) */}
                    <SleepModeIndicator />

                    {/* Sleep Mode Toggle */}
                    <button
                        onClick={toggleSleepMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${isSleepMode
                            ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {isSleepMode ? <Moon className="w-4 h-4 text-indigo-300" /> : <Sun className="w-4 h-4" />}
                        <span className="text-sm font-medium tracking-wide hidden sm:inline">
                            {isSleepMode ? 'SLEEP MODE: ON' : 'SLEEP MODE: OFF'}
                        </span>
                        {isSleepMode && (
                            <span className="relative flex h-2 w-2 ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                        )}
                    </button>

                    {/* Impact Score Badge (Gamification) */}
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 group-hover:border-white/20 transition-colors">
                        <Activity className={`w-4 h-4 ${rank.color}`} />
                        <span className={`text-sm font-mono ${rank.color} font-semibold`}>
                            {rank.icon} {rank.title} <span className="text-white/40">|</span> {impactScore}
                        </span>
                    </div>
                </div>

                {/* Mood Ticker Section */}
                <div className="w-full md:w-auto flex flex-col items-start md:items-end mt-4 md:mt-0">
                    <div className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        Jarvis Insight
                    </div>

                    <div className="h-8 overflow-hidden relative min-w-[200px] md:text-right">
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={tickerIndex}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="text-xl md:text-2xl font-medium text-white/95"
                            >
                                "{motivation}"
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Decorative Progress Line */}
            <motion.div
                key={tickerIndex}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
        </div>
    );
};
