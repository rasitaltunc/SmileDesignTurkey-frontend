import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from '@/lib/toast';

export default function TemplatesTab({
    settings,
    onSave
}: {
    settings?: any,
    onSave?: (updates: any) => Promise<void>
} = {}) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [showCustomModal, setShowCustomModal] = useState(false);

    // Initialize state from settings - watch specific property
    useEffect(() => {
        if (settings?.default_template_id) {
            setSelectedTemplate(settings.default_template_id);
            console.log('TemplatesTab sync:', settings.default_template_id);
        }
    }, [settings?.default_template_id]);

    const templates = [
        {
            id: 'detailed',
            name: 'Detailed Clinical',
            description: 'Full chief complaint, key points, long-form notes, signature'
        },
        {
            id: 'brief',
            name: 'Brief Summary',
            description: 'Short summary, 3-4 bullets, signature only'
        },
        {
            id: 'patient',
            name: 'Patient Copy',
            description: 'Simplified language, patient focus, recommendations'
        }
    ];

    const handleSelectTemplate = async (templateId: string) => {
        setSelectedTemplate(templateId); // Optimistic UI update

        if (onSave) {
            try {
                await onSave({ default_template_id: templateId });
                console.log('Template saved to DB:', templateId);
                toast.success('Template saved');
            } catch (err) {
                console.error('Failed to save template:', err);
                toast.error('Failed to save');
                setSelectedTemplate(null); // Rollback on error
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template.id)}
                        className={`relative flex items-start p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all ${selectedTemplate === template.id
                            ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500'
                            : 'border-gray-200'
                            }`}
                    >
                        <div className="min-w-0 flex-1 text-sm">
                            <label className="font-medium text-gray-900 select-none cursor-pointer">
                                {template.name}
                            </label>
                            <p className="text-gray-500">{template.description}</p>
                        </div>
                        <div className="ml-3 flex items-center h-5">
                            <input
                                type="radio"
                                name="template"
                                checked={selectedTemplate === template.id}
                                onChange={() => handleSelectTemplate(template.id)}
                                className="h-4 w-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Custom Template Button */}
            <button
                onClick={() => setShowCustomModal(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Create Custom Template
            </button>

            {/* Placeholder Modal for Create Custom Template */}
            {showCustomModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-gray-900">Create Custom Template</h3>
                        <p className="text-sm text-gray-600 mt-2">
                            Custom template creation coming in Step B. This modal will include:
                        </p>
                        <ul className="text-sm text-gray-500 mt-3 ml-4 list-disc space-y-1">
                            <li>Template name input</li>
                            <li>Section builder (drag & drop)</li>
                            <li>Preview pane</li>
                            <li>Save & Apply buttons</li>
                        </ul>
                        <button
                            onClick={() => setShowCustomModal(false)}
                            className="mt-6 w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
