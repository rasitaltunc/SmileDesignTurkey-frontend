import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

export default function TemplatesTab({
    settings,
    onSave
}: {
    settings?: any,
    onSave?: (updates: any) => Promise<void>
} = {}) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    // Initialize state from settings
    useEffect(() => {
        if (settings?.default_template_id) {
            setSelectedTemplate(settings.default_template_id);
        }
    }, [settings]);

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
        setSelectedTemplate(templateId);

        if (onSave) {
            try {
                await onSave({ default_template_id: templateId });
                toast.success('Template selected');
            } catch (err) {
                toast.error('Failed to save template');
                console.error(err);
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
            <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700">
                + Create Custom Template
            </button>
        </div>
    );
}
