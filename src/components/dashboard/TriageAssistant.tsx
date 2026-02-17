import React, { useState } from 'react';
import { Upload, Scan, CheckCircle, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

export function TriageAssistant() {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<{ teeth: number; cost: string } | null>(null);

    const handleUpload = () => {
        setAnalyzing(true);
        // Simulate AI Analysis Delay
        setTimeout(() => {
            setAnalyzing(false);
            setResult({
                teeth: 12,
                cost: "€4,200 - €5,500"
            });
        }, 2500);
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full">
            <div className="flex items-center space-x-2 mb-4">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">AI Triage Assistant</h3>
            </div>

            {!result && !analyzing && (
                <div
                    onClick={handleUpload}
                    className="border-2 border-dashed border-white/20 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition"
                >
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-400">Drop X-Ray here</span>
                </div>
            )}

            {analyzing && (
                <div className="border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <Scan className="w-8 h-8 text-indigo-400 mb-2" />
                    </motion.div>
                    <span className="text-xs text-indigo-300 animate-pulse">Scanning bone density...</span>
                </div>
            )}

            {result && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">Analysis Complete</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Detected Issues:</span>
                            <span className="text-white">{result.teeth} teeth requiring attention</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Est. Bone Loss:</span>
                            <span className="text-white">Minimal (&lt;10%)</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-sm font-bold">
                            <span className="text-indigo-300">Est. Quote:</span>
                            <span className="text-white">{result.cost}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setResult(null)}
                        className="w-full mt-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition"
                    >
                        Generate PDF Quote
                    </button>
                </div>
            )}
        </div>
    );
}
