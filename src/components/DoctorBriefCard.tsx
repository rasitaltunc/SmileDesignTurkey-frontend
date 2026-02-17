import React, { useState, useEffect } from "react";
import { Sparkles, ChevronDown, ChevronUp, Copy, RefreshCw, AlertCircle, Clock, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateBothPDFs, preparePDFData } from "@/lib/pdf/pdfGenerator";
import { toast } from "@/lib/toast";


import { XPBurst } from "./ui/XPBurst";

interface DoctorBriefCardProps {
    leadId: string;
    lead?: any; // Full lead object for PDF generation
    className?: string;
}

interface BriefData {
    patient_name: string;
    age: number | undefined | null; // Allow null or undefined
    contact: string;
    chief_complaint: string;
    key_points: string[];
    images: { filename: string; relevance_score: number; description: string }[];
    next_action: string;
    confidence_score: number;
}

export function DoctorBriefCard({ leadId, lead, className }: DoctorBriefCardProps) {
    const [brief, setBrief] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true); // Start loading immediately to avoid flicker
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [showXP, setShowXP] = useState(false);
    // Track if we've already done the auto-expand/collapse cycle
    const autoCollapseRef = React.useRef(false);

    const fetchBrief = async (force: boolean = false) => {
        setLoading(true);
        setError(null);

        // DEMO MODE BYPASS for Brief
        if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') {
            console.log('[DoctorBriefCard] ⚡️ DEMO MODE');
            await new Promise(r => setTimeout(r, 1200));
            setBrief({
                patient_name: lead?.name || "Sarah Connor",
                age: 34,
                contact: "+44 7700 900077",
                chief_complaint: lead?.message || "I want to fix my smile. It is very expensive though.",
                key_points: ["Price sensitivity", "Aesthetic concern", "High motivation"],
                images: [],
                next_action: "Schedule Video Consultation",
                confidence_score: 0.95
            });
            setLoading(false);
            if (!autoCollapseRef.current) {
                setExpanded(true);
                setTimeout(() => {
                    setExpanded(false);
                    autoCollapseRef.current = true;
                }, 15000);
            }
            return;
        }

        try {
            // In a real app, this would be your API endpoint
            // Adjust the URL if your environment differs
            const res = await fetch("/api/ai/generate-brief", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_id: leadId, force_refresh: force }),
            });

            if (!res.ok) {
                throw new Error("Failed to generate brief");
            }

            const data = await res.json();
            if (data.ok && data.brief) {
                setBrief(data.brief);
                // Auto-expand on load if not already done
                if (!autoCollapseRef.current) {
                    setExpanded(true);
                    // Auto-collapse after 15s
                    setTimeout(() => {
                        setExpanded(false);
                        autoCollapseRef.current = true;
                    }, 15000);
                }
            } else {
                throw new Error(data.error || "Unknown error");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (leadId) {
            console.log("[DoctorBriefCard] Fetching brief for:", leadId);
            fetchBrief();
        } else {
            console.warn("[DoctorBriefCard] Missing leadId");
            setLoading(false);
        }
    }, [leadId]);



    const toggleExpand = () => setExpanded(!expanded);

    const handleCopy = () => {
        if (!brief) return;
        const text = `
Patient: ${brief.patient_name} (${brief.age || "?"}y)
Complaint: ${brief.chief_complaint}
Key Points:
${brief.key_points.map((p) => `- ${p}`).join("\n")}
Action: ${brief.next_action}
    `.trim();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setShowXP(true); // Trigger XP Burst
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGeneratePDFs = async () => {
        if (!brief || !lead) {
            toast.error('Brief or lead data not available');
            return;
        }

        setGeneratingPDF(true);
        try {
            // Fetch doctor settings for signature
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

            // Get current user
            const { data: { user } } = await supabaseClient.auth.getUser();

            let doctorSettings = null;
            if (user) {
                const { data } = await supabaseClient
                    .from('doctor_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                doctorSettings = data;
            }

            // Prepare PDF data
            const { patientData, doctorData } = preparePDFData(
                lead,
                brief,
                doctorSettings || undefined
            );

            // Generate both PDFs
            await generateBothPDFs(patientData, doctorData);

            toast.success('PDFs generated successfully!');
        } catch (err: any) {
            console.error('PDF generation error:', err);
            toast.error(err.message || 'Failed to generate PDFs');
        } finally {
            setGeneratingPDF(false);
        }
    };

    if (loading && !brief) {
        return (
            <div className={cn("p-4 rounded-xl border border-border bg-card/50 animate-pulse", className)}>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500 animate-spin" />
                    <div className="h-4 w-32 bg-secondary rounded" />
                </div>
                <div className="h-16 bg-secondary/50 rounded w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-center gap-3", className)}>
                <AlertCircle className="w-5 h-5" />
                <div className="flex-1 text-sm font-medium">{error}</div>
                <button onClick={() => fetchBrief(true)} className="p-1 hover:bg-red-100 rounded">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (!brief && !loading && !error) {
        return null; // Should ideally not happen if loading logic is correct, but safe fallback
    }

    if (!brief && !loading) return null; // Redundant but keeping safe logic

    if (!brief && loading) {
        // Fallthrough to skeleton below (wait, I already have skeleton above)
    }

    if (!brief) return null; // Original check, but now loading is true initially so we see skeleton.

    return (
        <div className={cn(
            "group relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 transition-all duration-300 shadow-sm hover:shadow-md hover:border-purple-200",
            className,
            expanded ? "ring-1 ring-purple-200" : ""
        )}>
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer select-none"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            AI Summary <span className="text-gray-400 font-normal mx-1">•</span> <span className="text-gray-600">{brief.chief_complaint}</span>
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {brief.confidence_score < 0.8 && (
                        <span className="text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-full border border-amber-100 mr-2">
                            Missing info
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); fetchBrief(true); }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Refresh Brief"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin" : "")} />
                    </button>
                    <button
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={cn(
                "px-4 pb-4 space-y-3 transition-all duration-300 ease-in-out",
                expanded ? "block opacity-100" : "hidden opacity-0 h-0 overflow-hidden"
            )}>
                <div className="h-px bg-purple-100/50 w-full mb-3" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Points</h4>
                        <ul className="space-y-1.5">
                            {brief.key_points.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-700">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommended Action</h4>
                            <div className="bg-purple-50 text-purple-900 px-3 py-2 rounded-lg border border-purple-100 font-medium text-sm flex items-start gap-2">
                                <Clock className="w-4 h-4 text-purple-500 mt-0.5" />
                                {brief.next_action}
                            </div>
                        </div>

                        {brief.images.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Relevant Images</h4>
                                <div className="flex flex-wrap gap-2">
                                    {brief.images.map((img, i) => (
                                        <div key={i} className="text-xs px-2 py-1 bg-gray-50 border rounded text-gray-600" title={img.description}>
                                            {img.filename}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                        {copied ? <Sparkles className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy Summary"}
                    </button>
                    <button
                        onClick={handleGeneratePDFs}
                        disabled={generatingPDF}
                        className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generatingPDF ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                        ) : (
                            <><FileDown className="w-3.5 h-3.5" /> Generate PDFs</>
                        )}
                    </button>
                </div>
            </div>

            {showXP && (
                <XPBurst
                    amount={15}
                    label="AI Efficiency"
                    onComplete={() => setShowXP(false)}
                />
            )}
        </div>
    );
}
