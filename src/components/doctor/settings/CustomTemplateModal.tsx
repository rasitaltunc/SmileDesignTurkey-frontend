import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, FileText, Layout, ListChecks, Eye } from 'lucide-react';
import { toast } from '@/lib/toast';

interface CustomTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: CustomTemplate) => Promise<void>;
    existingTemplates: CustomTemplate[];
}

export interface CustomTemplate {
    id: string;
    name: string;
    description: string;
    layout: 'detailed' | 'brief' | 'patient';
    sections: string[];
    created_at: string;
}

const SECTION_OPTIONS = [
    { id: 'header', name: 'Header & Patient Info', description: 'Patient name, date, clinic info' },
    { id: 'chief_complaint', name: 'Chief Complaint', description: 'Primary reason for visit' },
    { id: 'clinical_notes', name: 'Clinical Notes', description: 'Detailed clinical observations' },
    { id: 'treatment_plan', name: 'Treatment Plan', description: 'Proposed treatments and procedures' },
    { id: 'materials', name: 'Materials & Pricing', description: 'Materials used and cost breakdown' },
    { id: 'recommendations', name: 'Recommendations', description: 'Post-treatment recommendations' },
    { id: 'follow_up', name: 'Follow-up Instructions', description: 'Next appointment and care instructions' },
    { id: 'signature', name: 'Doctor Signature', description: 'Digital signature area' },
    { id: 'stamp', name: 'Clinic Stamp', description: 'Official clinic stamp' },
];

const LAYOUT_OPTIONS = [
    { id: 'detailed', name: 'Detailed Clinical', description: 'Full documentation with all sections', icon: '📋' },
    { id: 'brief', name: 'Brief Summary', description: 'Concise overview for quick reference', icon: '📝' },
    { id: 'patient', name: 'Patient Copy', description: 'Simplified version for patients', icon: '👤' },
];

export default function CustomTemplateModal({ isOpen, onClose, onSave, existingTemplates }: CustomTemplateModalProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [layout, setLayout] = useState<'detailed' | 'brief' | 'patient'>('detailed');
    const [selectedSections, setSelectedSections] = useState<string[]>(['header', 'treatment_plan', 'signature']);

    const resetForm = () => {
        setStep(1);
        setName('');
        setDescription('');
        setLayout('detailed');
        setSelectedSections(['header', 'treatment_plan', 'signature']);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const toggleSection = (sectionId: string) => {
        setSelectedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(s => s !== sectionId)
                : [...prev, sectionId]
        );
    };

    const selectAllSections = () => setSelectedSections(SECTION_OPTIONS.map(s => s.id));
    const deselectAllSections = () => setSelectedSections([]);

    const canProceed = () => {
        switch (step) {
            case 1: return name.trim().length > 0;
            case 2: return layout !== null;
            case 3: return selectedSections.length > 0;
            case 4: return true;
            default: return false;
        }
    };

    const handleNext = () => {
        if (canProceed() && step < 4) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleCreate = async () => {
        if (!canProceed()) return;

        setIsLoading(true);
        try {
            const newTemplate: CustomTemplate = {
                id: crypto.randomUUID(),
                name: name.trim(),
                description: description.trim(),
                layout,
                sections: selectedSections,
                created_at: new Date().toISOString(),
            };

            await onSave(newTemplate);
            toast.success('Template created successfully!');
            handleClose();
        } catch (err: any) {
            console.error('Failed to create template:', err);
            toast.error(err.message || 'Failed to create template');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const steps = [
        { num: 1, label: 'Name', icon: FileText },
        { num: 2, label: 'Layout', icon: Layout },
        { num: 3, label: 'Sections', icon: ListChecks },
        { num: 4, label: 'Preview', icon: Eye },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Create Custom Template</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        {steps.map((s, i) => (
                            <div key={s.num} className="flex items-center">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === s.num
                                        ? 'bg-teal-100 text-teal-700'
                                        : step > s.num
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Name & Description */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Implant Summary, Veneer Report"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of when to use this template..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Choose Layout */}
                    {step === 2 && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">Choose a base layout for your template:</p>
                            {LAYOUT_OPTIONS.map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => setLayout(opt.id as typeof layout)}
                                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${layout === opt.id
                                            ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="text-2xl">{opt.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{opt.name}</p>
                                        <p className="text-sm text-gray-500">{opt.description}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${layout === opt.id ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                                        }`}>
                                        {layout === opt.id && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Select Sections */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">Select sections to include:</p>
                                <div className="flex gap-2">
                                    <button onClick={selectAllSections} className="text-xs text-teal-600 hover:underline">Select All</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={deselectAllSections} className="text-xs text-gray-500 hover:underline">Deselect All</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {SECTION_OPTIONS.map((section) => (
                                    <label
                                        key={section.id}
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedSections.includes(section.id)
                                                ? 'border-teal-500 bg-teal-50/30'
                                                : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSections.includes(section.id)}
                                            onChange={() => toggleSection(section.id)}
                                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{section.name}</p>
                                            <p className="text-xs text-gray-500">{section.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 text-center">{selectedSections.length} sections selected</p>
                        </div>
                    )}

                    {/* Step 4: Preview & Confirm */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Template Name</p>
                                    <p className="text-lg font-semibold text-gray-900">{name}</p>
                                </div>
                                {description && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Description</p>
                                        <p className="text-sm text-gray-700">{description}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Base Layout</p>
                                    <p className="text-sm text-gray-700">{LAYOUT_OPTIONS.find(l => l.id === layout)?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sections ({selectedSections.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedSections.map(sId => {
                                            const section = SECTION_OPTIONS.find(s => s.id === sId);
                                            return (
                                                <span key={sId} className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                                                    {section?.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Ready to create!</strong> Your template will be saved and available in the templates list.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={step === 1}
                        className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className="flex items-center gap-1 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleCreate}
                                disabled={isLoading || !canProceed()}
                                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Create Template
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
