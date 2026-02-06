import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import CustomTemplateModal, { CustomTemplate } from './CustomTemplateModal';

export default function TemplatesTab({
    settings,
    onSave
}: {
    settings?: any,
    onSave?: (updates: any) => Promise<void>
} = {}) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

    // Initialize state from settings
    useEffect(() => {
        if (settings?.default_template_id) {
            setSelectedTemplate(settings.default_template_id);
            console.log('TemplatesTab sync:', settings.default_template_id);
        }
        if (settings?.custom_templates && Array.isArray(settings.custom_templates)) {
            setCustomTemplates(settings.custom_templates);
            console.log('Custom templates loaded:', settings.custom_templates.length);
        }
    }, [settings?.default_template_id, settings?.custom_templates]);

    const builtInTemplates = [
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

    const handleSaveCustomTemplate = async (template: CustomTemplate) => {
        const updatedTemplates = [...customTemplates, template];
        setCustomTemplates(updatedTemplates);

        if (onSave) {
            await onSave({ custom_templates: updatedTemplates });
        }
    };

    const handleDeleteCustomTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const template = customTemplates.find(t => t.id === templateId);
        if (!template) return;

        if (!window.confirm(`Delete "${template.name}" template?`)) return;

        const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
        setCustomTemplates(updatedTemplates);

        // If deleted template was selected, clear selection
        if (selectedTemplate === templateId) {
            setSelectedTemplate(null);
        }

        if (onSave) {
            try {
                await onSave({
                    custom_templates: updatedTemplates,
                    ...(selectedTemplate === templateId ? { default_template_id: null } : {})
                });
                toast.success('Template deleted');
            } catch (err) {
                console.error('Failed to delete template:', err);
                toast.error('Failed to delete');
                // Rollback
                setCustomTemplates(customTemplates);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Built-in Templates Section */}
            <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Built-in Templates</h4>
                <div className="grid grid-cols-1 gap-3">
                    {builtInTemplates.map((template) => (
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
            </div>

            {/* Custom Templates Section */}
            {customTemplates.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Custom Templates</h4>
                    <div className="grid grid-cols-1 gap-3">
                        {customTemplates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => handleSelectTemplate(template.id)}
                                className={`relative flex items-start p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all group ${selectedTemplate === template.id
                                    ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500'
                                    : 'border-gray-200'
                                    }`}
                            >
                                <div className="min-w-0 flex-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <label className="font-medium text-gray-900 select-none cursor-pointer">
                                            {template.name}
                                        </label>
                                        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Custom</span>
                                    </div>
                                    <p className="text-gray-500">{template.description || `${template.sections.length} sections • ${template.layout} layout`}</p>
                                </div>
                                <div className="ml-3 flex items-center gap-3">
                                    <button
                                        onClick={(e) => handleDeleteCustomTemplate(template.id, e)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete template"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                </div>
            )}

            {/* Create Custom Template Button */}
            <button
                onClick={() => setShowCustomModal(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Create Custom Template
            </button>

            {/* Custom Template Modal */}
            <CustomTemplateModal
                isOpen={showCustomModal}
                onClose={() => setShowCustomModal(false)}
                onSave={handleSaveCustomTemplate}
                existingTemplates={customTemplates}
            />
        </div>
    );
}
