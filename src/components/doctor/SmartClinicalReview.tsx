import React, { useState } from 'react';
import {
    X,
    Maximize2,
    MessageSquare,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ScanLine,
    ZoomIn,
    ArrowRight
} from 'lucide-react';

interface SmartClinicalReviewProps {
    patientName?: string;
    patientId?: string;
    photos?: string[];
    onClose?: () => void;
}

export default function SmartClinicalReview({
    patientName = "Sarah Connor",
    patientId = "CASE-1029",
    photos = [
        "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800", // Smile
        "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=800", // Teeth
        "https://plus.unsplash.com/premium_photo-1661775756810-82dbd209da95?auto=format&fit=crop&q=80&w=800"  // X-Ray mock
    ],
    onClose
}: SmartClinicalReviewProps) {
    const [activePhoto, setActivePhoto] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'approved' | 'rejected'>('idle');

    const handleScan = () => {
        setIsScanning(true);
        setTimeout(() => setIsScanning(false), 2000);
    };

    const handleApprove = () => {
        setStatus('approved');
        toast.success('Approved & Sent to Consultant', {
            description: 'Patient protocol has been forwarded to Ayşe.',
            duration: 3000,
        });
        setTimeout(() => onClose?.(), 1500); // Close after animation
    };

    const handleReject = () => {
        setStatus('rejected');
        toast.error("Case Rejected", {
            description: "Consultant notified to request new photos."
        });
        setTimeout(() => onClose?.(), 1500);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">

            {/* Main Modal Container */}
            <div className="bg-slate-900 w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col md:flex-row relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left: Photo Analysis Canvas (70%) */}
                <div className="flex-1 bg-black relative group overflow-hidden flex items-center justify-center">

                    {/* Scanning Overlay Effect */}
                    {isScanning && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            <div className="w-full h-1 bg-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.5)] absolute top-0 animate-scan"></div>
                            <div className="absolute top-4 right-4 bg-teal-900/80 text-teal-300 text-xs font-mono px-2 py-1 rounded border border-teal-700">
                                ANALYSIS IN PROGRESS...
                            </div>
                        </div>
                    )}

                    {/* AI Bounding Boxes (Mock) */}
                    {!isScanning && (
                        <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute top-[30%] left-[40%] w-24 h-24 border border-teal-500/50 rounded-lg">
                                <span className="absolute -top-6 left-0 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded">GUM LINE</span>
                            </div>
                            <div className="absolute bottom-[20%] right-[30%] w-32 h-16 border border-rose-500/50 rounded-lg">
                                <span className="absolute -bottom-6 right-0 bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded">DECAY RISK</span>
                            </div>
                        </div>
                    )}

                    <img
                        src={photos[activePhoto]}
                        alt="Clinical View"
                        className="w-full h-full object-contain"
                    />

                    {/* Photo Navigation Dots */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                        {photos.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActivePhoto(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${activePhoto === idx ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="absolute bottom-6 right-6 flex gap-2">
                        <button
                            onClick={handleScan}
                            className="p-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-900/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <ScanLine className="w-5 h-5" />
                            <span className="text-sm font-semibold">AI Scan</span>
                        </button>
                        <button className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl backdrop-blur-md transition-all">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl backdrop-blur-md transition-all">
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Right: Clinical Action Panel (30%) */}
                <div className="w-full md:w-[400px] bg-slate-900 border-l border-slate-700 flex flex-col">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
                                SC
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">{patientName}</h2>
                                <p className="text-slate-400 text-xs font-mono">{patientId}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <span className="px-2 py-1 bg-slate-800 rounded-md text-slate-300 text-xs font-medium border border-slate-700">
                                📸 8 Photos
                            </span>
                            <span className="px-2 py-1 bg-slate-800 rounded-md text-slate-300 text-xs font-medium border border-slate-700">
                                🦴 X-Ray Ready
                            </span>
                        </div>
                    </div>

                    {/* AI Findings Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Finding 1 */}
                        <div className="space-y-2">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI PRE-SCREENING</h3>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-teal-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-teal-400 font-semibold text-sm">Class II Malocclusion</h4>
                                    <span className="text-teal-500/60 text-xs">94% conf.</span>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Upper jaw significantly overhangs the lower jaw. Aligners recommended before veneers.
                                </p>
                            </div>
                        </div>

                        {/* Finding 2 */}
                        <div className="space-y-2">
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-rose-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-rose-400 font-semibold text-sm">Possible Root Infection</h4>
                                    <span className="text-rose-500/60 text-xs mb-1"><AlertTriangle className="w-3 h-3 inline mr-1" />High Risk</span>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Shadow detected on Tooth #14 (Upper Left First Molar). Needs X-Ray confirmation.
                                </p>
                            </div>
                        </div>

                        {/* Consultant Note */}
                        <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-500/30">
                            <div className="flex items-center gap-2 mb-2 text-indigo-300">
                                <MessageSquare className="w-3 h-3" />
                                <span className="text-xs font-bold uppercase">Consultant Note</span>
                            </div>
                            <p className="text-indigo-100/80 text-sm italic">
                                "Patient is very anxious about pain. She specifically asked if we do IV Sedation."
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions Footer */}
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm space-y-3">
                        <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Approve for Booking
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2">
                                <XCircle className="w-4 h-4 text-rose-400" />
                                Reject
                            </button>
                            <button className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2">
                                <span className="text-amber-400 font-bold">?</span>
                                Request Info
                            </button>
                        </div>

                        <p className="text-center text-slate-500 text-xs pt-2">
                            Approved treatment plans are sent to consultant immediately.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
