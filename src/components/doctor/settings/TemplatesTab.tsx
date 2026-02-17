/**
 * TemplatesTab - Enhanced with Clone from Built-in and Database Integration
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Manage custom PDF templates with version history
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Star, StarOff, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';
import CustomTemplateModal from './CustomTemplateModal';
import {
    CustomPdfTemplate,
    BuiltinTemplate,
    fetchTemplates,
    fetchBuiltinTemplates,
    createTemplate,
    deleteTemplate,
    toggleTemplateFavorite,
    cloneBuiltinTemplate,
    LAYOUT_OPTIONS,
} from '@/lib/templateService';

interface TemplatesTabProps {
    settings?: any;
    onSave?: (updates: any) => Promise<void>;
}

export default function TemplatesTab({ settings, onSave }: TemplatesTabProps = {}) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [showCloneModal, setShowCloneModal] = useState(false);

    // Templates from database
    const [customTemplates, setCustomTemplates] = useState<CustomPdfTemplate[]>([]);
    const [builtinTemplates, setBuiltinTemplates] = useState<BuiltinTemplate[]>([]);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isCloning, setIsCloning] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Error state
    const [error, setError] = useState<string | null>(null);

    // Load templates from database
    useEffect(() => {
        loadTemplates();
    }, []);

    // Sync selected template from settings
    useEffect(() => {
        if (settings?.default_template_id) {
            setSelectedTemplate(settings.default_template_id);
        }
    }, [settings?.default_template_id]);

    const loadTemplates = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [custom, builtin] = await Promise.all([
                fetchTemplates(),
                fetchBuiltinTemplates(),
            ]);
            setCustomTemplates(custom);
            setBuiltinTemplates(builtin);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectTemplate = async (templateId: string) => {
        setSelectedTemplate(templateId);
        if (onSave) {
            try {
                await onSave({ default_template_id: templateId });
                toast.success('Default template updated');
            } catch (err) {
                console.error('Failed to save template:', err);
                toast.error('Failed to save');
                setSelectedTemplate(null);
            }
        }
    };

    const handleCloneBuiltin = async (builtinId: string) => {
        setIsCloning(builtinId);
        try {
            const cloned = await cloneBuiltinTemplate(builtinId);
            if (cloned) {
                setCustomTemplates(prev => [cloned, ...prev]);
                toast.success('Template cloned! You can now customize it.');
                setShowCloneModal(false);
            }
        } catch (err) {
            console.error('Failed to clone template:', err);
            toast.error('Failed to clone template');
        } finally {
            setIsCloning(null);
        }
    };

    const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const template = customTemplates.find(t => t.id === templateId);
        if (!template) return;

        if (!window.confirm(`Delete "${template.name}" template?`)) return;

        setIsDeleting(templateId);
        try {
            await deleteTemplate(templateId);
            setCustomTemplates(prev => prev.filter(t => t.id !== templateId));

            if (selectedTemplate === templateId) {
                setSelectedTemplate(null);
                if (onSave) await onSave({ default_template_id: null });
            }

            toast.success('Template deleted');
        } catch (err) {
            console.error('Failed to delete template:', err);
            toast.error('Failed to delete');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleToggleFavorite = async (templateId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleTemplateFavorite(templateId, !currentStatus);
            setCustomTemplates(prev =>
                prev.map(t => t.id === templateId ? { ...t, is_favorite: !currentStatus } : t)
            );
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
            toast.error('Failed to update');
        }
    };

    const handleSaveNewTemplate = async (templateData: any) => {
        try {
            const created = await createTemplate({
                name: templateData.name,
                description: templateData.description,
                layout: templateData.layout,
                sections: templateData.sections,
            });

            if (created) {
                setCustomTemplates(prev => [created, ...prev]);
                toast.success('Template created!');
            }
        } catch (err) {
            console.error('Failed to create template:', err);
            throw err;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-red-700 font-medium">{error}</p>
                    <button
                        onClick={loadTemplates}
                        className="text-sm text-red-600 hover:underline mt-1 flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" /> Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Clone from Built-in Templates Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-500">Built-in Templates</h4>
                    <button
                        onClick={() => setShowCloneModal(!showCloneModal)}
                        className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                        <Copy className="w-3 h-3" />
                        Clone from template
                    </button>
                </div>

                {/* Clone Modal */}
                {showCloneModal && (
                    <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-gray-600">Select a built-in template to clone and customize:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {builtinTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleCloneBuiltin(template.id)}
                                    disabled={isCloning !== null}
                                    className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all text-left disabled:opacity-50"
                                >
                                    <span className="text-xl">{template.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-sm truncate">{template.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{template.description}</p>
                                    </div>
                                    {isCloning === template.id && (
                                        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Built-in Templates List */}
                <div className="grid grid-cols-1 gap-3">
                    {builtinTemplates.slice(0, 3).map(template => (
                        <div
                            key={template.id}
                            onClick={() => handleSelectTemplate(template.id)}
                            className={`relative flex items-start p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all ${selectedTemplate === template.id
                                    ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500'
                                    : 'border-gray-200'
                                }`}
                        >
                            <span className="text-xl mr-3">{template.icon}</span>
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
                    <h4 className="text-sm font-medium text-gray-500 mb-3">
                        Custom Templates ({customTemplates.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {customTemplates.map(template => (
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
                                        {template.is_favorite && (
                                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                        )}
                                        <span className={`px-1.5 py-0.5 text-xs rounded ${template.template_type === 'cloned'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {template.template_type === 'cloned' ? 'Cloned' : 'Custom'}
                                        </span>
                                        {template.current_version > 1 && (
                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                                <Clock className="w-3 h-3" /> v{template.current_version}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-500">
                                        {template.description || `${template.sections?.length || 0} sections • ${LAYOUT_OPTIONS.find(l => l.id === template.layout)?.name || template.layout}`}
                                    </p>
                                </div>
                                <div className="ml-3 flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleToggleFavorite(template.id, template.is_favorite, e)}
                                        className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        title={template.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                        {template.is_favorite ? (
                                            <StarOff className="w-4 h-4" />
                                        ) : (
                                            <Star className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                                        disabled={isDeleting === template.id}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                        title="Delete template"
                                    >
                                        {isDeleting === template.id ? (
                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
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
                onSave={handleSaveNewTemplate}
                existingTemplates={customTemplates}
            />
        </div>
    );
}
