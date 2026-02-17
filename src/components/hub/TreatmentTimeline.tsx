import { useState, useMemo } from 'react';
import { Check, Circle, Lock, ChevronRight } from 'lucide-react';

interface TimelineStep {
    id: number;
    title: string;
    subtitle: string;
    date?: string;
    status: 'completed' | 'current' | 'upcoming';
    detail?: string;
}

const STEPS_TEMPLATE: Omit<TimelineStep, 'status'>[] = [
    {
        id: 1,
        title: 'Initial Consultation',
        subtitle: 'Video call with your consultant',
        detail: 'Ayşe reviewed your photos and medical history',
    },
    {
        id: 2,
        title: 'X-ray & Diagnosis',
        subtitle: 'Panoramic X-ray evaluated',
        detail: 'Dr. Mehmet confirmed treatment plan: 20 veneers',
    },
    {
        id: 3,
        title: 'Quote Approved',
        subtitle: 'Hollywood Smile package confirmed',
        detail: 'Signature package selected — flights being arranged',
    },
    {
        id: 4,
        title: 'Travel & Preparation',
        subtitle: 'Flights, hotel & clinic schedule',
    },
    {
        id: 5,
        title: 'Treatment & Recovery',
        subtitle: 'Your new smile awaits',
    },
];

interface TreatmentTimelineProps {
    /** Override treatment name */
    treatmentName?: string;
    /** Current stage of the patient */
    currentStage?: string;
    /** Callback when step is clicked */
    onStepClick?: (step: TimelineStep) => void;
}

export function TreatmentTimeline({
    treatmentName = 'Hollywood Smile',
    currentStage = 'new',
    onStepClick,
}: TreatmentTimelineProps) {
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    // Map lead status to step index (0-based)
    // 0: Initial Contact
    // 1: Diagnosis
    // 2: Quote/Approval
    // 3: Travel
    // 4: Treatment
    const activeStepIndex = useMemo(() => {
        const stage = currentStage?.toLowerCase() || 'new';
        if (stage.includes('treatment') || stage.includes('recovery')) return 4;
        if (stage.includes('book') || stage.includes('travel') || stage.includes('deposit')) return 3;
        if (stage.includes('prove') || stage.includes('sent') || stage.includes('protocol')) return 2;
        if (stage.includes('diagnos') || stage.includes('photo') || stage.includes('x-ray')) return 1;
        return 0; // Default to start
    }, [currentStage]);

    const steps = useMemo(() => {
        return STEPS_TEMPLATE.map((step, index) => {
            let status: TimelineStep['status'] = 'upcoming';
            if (index < activeStepIndex) status = 'completed';
            else if (index === activeStepIndex) status = 'current';

            return { ...step, status };
        });
    }, [activeStepIndex]);

    const handleStepClick = (step: TimelineStep) => {
        if (step.status === 'upcoming') return;
        setExpandedStep(expandedStep === step.id ? null : step.id);
        onStepClick?.(step);
    };

    return (
        <div className="hub-glass p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--hub-text-muted)' }}>
                        YOUR JOURNEY
                    </p>
                    <h3 className="text-base font-bold mt-0.5" style={{ color: 'var(--hub-text-primary)' }}>
                        {treatmentName}
                    </h3>
                </div>
                <span className="hub-badge hub-badge--success">
                    Step {activeStepIndex + 1} of {STEPS_TEMPLATE.length}
                </span>
            </div>

            <div className="hub-timeline">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`hub-timeline-step hub-timeline-step--${step.status}`}
                        onClick={() => handleStepClick(step)}
                        role={step.status !== 'upcoming' ? 'button' : undefined}
                        tabIndex={step.status !== 'upcoming' ? 0 : undefined}
                    >
                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div
                                className="hub-timeline-line"
                                style={{
                                    background: step.status === 'completed'
                                        ? 'var(--hub-accent)'
                                        : 'var(--hub-glass-border)',
                                }}
                            />
                        )}

                        {/* Step indicator */}
                        <div className={`hub-timeline-dot hub-timeline-dot--${step.status}`}>
                            {step.status === 'completed' && (
                                <Check className="w-3 h-3 text-white" />
                            )}
                            {step.status === 'current' && (
                                <Circle className="w-3 h-3" style={{ color: 'var(--hub-accent)', fill: 'var(--hub-accent)' }} />
                            )}
                            {step.status === 'upcoming' && (
                                <Lock className="w-2.5 h-2.5" style={{ color: 'var(--hub-text-muted)' }} />
                            )}
                        </div>

                        {/* Content */}
                        <div className="hub-timeline-content">
                            <div className="flex items-center justify-between">
                                <p
                                    className="text-sm font-semibold"
                                    style={{
                                        color: step.status === 'upcoming'
                                            ? 'var(--hub-text-muted)'
                                            : 'var(--hub-text-primary)',
                                    }}
                                >
                                    {step.title}
                                </p>
                                {step.date && (
                                    <span className="text-[10px]" style={{ color: 'var(--hub-text-muted)' }}>
                                        {step.date}
                                    </span>
                                )}
                            </div>
                            <p
                                className="text-xs mt-0.5"
                                style={{
                                    color: step.status === 'upcoming'
                                        ? 'rgba(100,116,139,0.5)'
                                        : 'var(--hub-text-secondary)',
                                }}
                            >
                                {step.subtitle}
                            </p>

                            {/* Expanded detail — butter-smooth slide */}
                            {step.detail && (
                                <div
                                    className="hub-timeline-detail"
                                    style={{
                                        maxHeight: expandedStep === step.id ? '120px' : '0',
                                        opacity: expandedStep === step.id ? 1 : 0,
                                        marginTop: expandedStep === step.id ? '8px' : '0',
                                    }}
                                >
                                    <div
                                        className="p-2.5 rounded-lg text-xs"
                                        style={{
                                            background: 'rgba(20, 184, 166, 0.08)',
                                            color: 'var(--hub-accent)',
                                            border: '1px solid rgba(20, 184, 166, 0.15)',
                                        }}
                                    >
                                        {step.detail}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Expand arrow for clickable steps */}
                        {step.status !== 'upcoming' && (
                            <ChevronRight
                                className="w-4 h-4 flex-shrink-0 transition-transform"
                                style={{
                                    color: 'var(--hub-text-muted)',
                                    transform: expandedStep === step.id ? 'rotate(90deg)' : 'rotate(0)',
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
