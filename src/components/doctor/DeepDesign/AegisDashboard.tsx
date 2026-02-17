import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
    X,
    Check,
    Clock,
    Phone,
    FileText,
    Search,
    Filter,
    User,
    ChevronRight,
    Stethoscope,
    Activity,
    ShieldCheck
} from 'lucide-react';
import { useSound } from '../../ui/SoundManager';

// --- Types ---
interface PatientCard {
    id: string;
    name: string;
    age: number;
    country: string;
    issue: string;
    urgency: 'high' | 'medium' | 'low';
    image?: string;
    status: 'pending' | 'approved' | 'rejected' | 'more_info';
    timeAgo: string;
}

// --- Mock Data ---
const MOCK_PATIENTS: PatientCard[] = [
    {
        id: '1',
        name: 'Sarah Connor',
        age: 34,
        country: 'UK',
        issue: 'Full Mouth Implants',
        urgency: 'high',
        status: 'pending',
        timeAgo: '2m'
    },
    {
        id: '2',
        name: 'John Anderson',
        age: 45,
        country: 'Germany',
        issue: 'Veneers (20 units)',
        urgency: 'medium',
        status: 'pending',
        timeAgo: '15m'
    },
    {
        id: '3',
        name: 'Elena Fisher',
        age: 29,
        country: 'USA',
        issue: 'Invisalign Inquiry',
        urgency: 'low',
        status: 'pending',
        timeAgo: '1h'
    }
];

export default function AegisDashboard() {
    const [patients, setPatients] = useState<PatientCard[]>(MOCK_PATIENTS);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const { playSound } = useSound();

    const currentPatient = patients[currentIndex];

    // --- Actions ---
    const handleSwipe = (dir: 'left' | 'right') => {
        if (!currentPatient) return;

        setDirection(dir);

        // Sound FX
        if (dir === 'right') playSound('success');
        else playSound('error');

        setTimeout(() => {
            // Remove current and advance
            const newPatients = [...patients];
            newPatients[currentIndex] = {
                ...currentPatient,
                status: dir === 'right' ? 'approved' : 'rejected'
            };
            setPatients(newPatients);

            // Advance index if not last
            if (currentIndex < patients.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setDirection(null);
            } else {
                // End of list state
                setDirection(null);
                setCurrentIndex(prev => prev + 1);
            }
        }, 200);
    };

    const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 100) {
            handleSwipe('right');
        } else if (info.offset.x < -100) {
            handleSwipe('left');
        }
    };

    // --- Render ---
    if (currentIndex >= patients.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-breathe">
                    <ShieldCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    All Clear, Captain.
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    No pending triage actions. You are in valid "Flow State".
                </p>
                <button
                    onClick={() => setCurrentIndex(0)}
                    className="mt-8 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    Review Completed Actions
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-md mx-auto h-[600px] flex flex-col pt-10">
            {/* Header HUD */}
            <div className="flex items-center justify-between mb-6 px-4">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-500" />
                        AEGIS TRIAGE
                    </h1>
                    <p className="text-xs text-gray-500 font-mono">LIVE FEED • {patients.length - currentIndex} PENDING</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center border border-gray-200 dark:border-slate-700">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
            </div>

            {/* Card Stack */}
            <div className="flex-1 relative flex items-center justify-center">
                <AnimatePresence>
                    <motion.div
                        key={currentPatient.id}
                        className="absolute w-full h-[450px] px-4"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={onDragEnd}
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{
                            x: direction === 'right' ? 500 : direction === 'left' ? -500 : 0,
                            opacity: 0,
                            scale: 0.9,
                            transition: { duration: 0.2 }
                        }}
                        style={{ zIndex: 10 }}
                        whileDrag={{ rotate: 0 }}
                    >
                        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col relative">

                            {/* Status Overlay on Drag */}
                            <motion.div
                                className="absolute top-10 right-10 z-20 pointer-events-none"
                                style={{ opacity: 0 }} // Bind to x value in real implementation
                            >
                                <div className="border-4 border-green-500 text-green-500 font-bold text-3xl px-4 py-2 rounded-lg transform -rotate-12">
                                    APPROVE
                                </div>
                            </motion.div>

                            {/* Card Content */}
                            <div className="h-1/2 bg-gray-100 dark:bg-slate-800 relative">
                                {/* Placeholder for Patient Image */}
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-slate-600">
                                    <User className="w-24 h-24" />
                                </div>

                                {/* Urgency Badge */}
                                <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-full flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                        {currentPatient.urgency} Priority
                                    </span>
                                </div>

                                {/* Time Badge */}
                                <div className="absolute top-4 right-4 px-3 py-1 bg-black/10 backdrop-blur-md rounded-full flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {currentPatient.timeAgo}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 p-6 flex flex-col">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                    {currentPatient.name}, {currentPatient.age}
                                </h2>
                                <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                                    {currentPatient.country} • <span className="text-teal-600 font-semibold">{currentPatient.issue}</span>
                                </p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span>X-Rays Available</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                                        <Stethoscope className="w-4 h-4 text-gray-400" />
                                        <span>Previous: Root Canal (2019)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Hints */}
                            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-gray-100 dark:from-slate-900 via-transparent opacity-50" />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="h-24 flex items-center justify-center gap-6 pb-6">
                <button
                    onClick={() => handleSwipe('left')}
                    className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-red-500 hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">
                    Swipe to Triage
                </div>
                <button
                    onClick={() => handleSwipe('right')}
                    className="w-14 h-14 rounded-full bg-teal-500 shadow-lg shadow-teal-500/30 flex items-center justify-center text-white hover:scale-110 hover:bg-teal-400 transition-all duration-200"
                >
                    <Check className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
