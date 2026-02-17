/**
 * Template Types and Supabase CRUD Functions
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Manage custom PDF templates with version history
 */

import { getSupabaseClient } from './supabaseClient';

// =================================================================
// Types
// =================================================================

export interface CustomPdfTemplate {
    id: string;
    doctor_id: string;
    clinic_id?: string | null;

    // Metadata
    name: string;
    description?: string;

    // Template Config
    layout: 'detailed' | 'brief' | 'patient';
    template_type: 'builtin' | 'custom' | 'cloned';
    cloned_from?: string | null;

    // Content
    sections: string[];
    variables: Record<string, any>;

    // Version History
    previous_versions: TemplateVersion[];
    current_version: number;

    // Status
    is_active: boolean;
    is_favorite: boolean;
    usage_count: number;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface TemplateVersion {
    version: number;
    sections: string[];
    variables: Record<string, any>;
    updated_at: string;
}

export interface BuiltinTemplate {
    id: string;
    name: string;
    description: string;
    layout: 'detailed' | 'brief' | 'patient';
    sections: string[];
    icon: string;
    sort_order: number;
    is_active: boolean;
}

export interface CreateTemplateInput {
    name: string;
    description?: string;
    layout: 'detailed' | 'brief' | 'patient';
    sections: string[];
    variables?: Record<string, any>;
    template_type?: 'custom' | 'cloned';
    cloned_from?: string;
}

export interface UpdateTemplateInput {
    name?: string;
    description?: string;
    layout?: 'detailed' | 'brief' | 'patient';
    sections?: string[];
    variables?: Record<string, any>;
    is_active?: boolean;
    is_favorite?: boolean;
}

// =================================================================
// Section Options (for UI)
// =================================================================

export const SECTION_OPTIONS = [
    { id: 'header', name: 'Header & Patient Info', description: 'Patient name, date, clinic info', icon: '📋' },
    { id: 'chief_complaint', name: 'Chief Complaint', description: 'Primary reason for visit', icon: '🎯' },
    { id: 'clinical_notes', name: 'Clinical Notes', description: 'Detailed clinical observations', icon: '📝' },
    { id: 'treatment_plan', name: 'Treatment Plan', description: 'Proposed treatments and procedures', icon: '🦷' },
    { id: 'materials', name: 'Materials & Pricing', description: 'Materials used and cost breakdown', icon: '💰' },
    { id: 'recommendations', name: 'Recommendations', description: 'Post-treatment recommendations', icon: '💡' },
    { id: 'follow_up', name: 'Follow-up Instructions', description: 'Next appointment and care instructions', icon: '📅' },
    { id: 'signature', name: 'Doctor Signature', description: 'Digital signature area', icon: '✍️' },
    { id: 'stamp', name: 'Clinic Stamp', description: 'Official clinic stamp', icon: '🏥' },
];

export const LAYOUT_OPTIONS = [
    { id: 'detailed', name: 'Detailed Clinical', description: 'Full documentation with all sections', icon: '📋' },
    { id: 'brief', name: 'Brief Summary', description: 'Concise overview for quick reference', icon: '📝' },
    { id: 'patient', name: 'Patient Copy', description: 'Simplified version for patients', icon: '👤' },
];

// =================================================================
// CRUD Functions
// =================================================================

/**
 * Fetch all templates for the current user
 */
export async function fetchTemplates(): Promise<CustomPdfTemplate[]> {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('[Templates] Supabase not configured');
        return [];
    }

    try {
        const { data, error } = await client
            .from('custom_pdf_templates')
            .select('*')
            .eq('is_active', true)
            .order('is_favorite', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[Templates] Failed to fetch:', error);
        return [];
    }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<CustomPdfTemplate | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data, error } = await client
            .from('custom_pdf_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Templates] Failed to get template:', error);
        return null;
    }
}

/**
 * Create a new template
 */
export async function createTemplate(input: CreateTemplateInput): Promise<CustomPdfTemplate | null> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase not configured');
    }

    // Get current user
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    try {
        const { data, error } = await client
            .from('custom_pdf_templates')
            .insert({
                doctor_id: user.id,
                name: input.name,
                description: input.description || '',
                layout: input.layout,
                sections: input.sections,
                variables: input.variables || {},
                template_type: input.template_type || 'custom',
                cloned_from: input.cloned_from || null,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Templates] Failed to create:', error);
        throw error;
    }
}

/**
 * Update an existing template (triggers version history)
 */
export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<CustomPdfTemplate | null> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase not configured');
    }

    try {
        const { data, error } = await client
            .from('custom_pdf_templates')
            .update({
                ...input,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Templates] Failed to update:', error);
        throw error;
    }
}

/**
 * Soft delete a template (sets is_active to false)
 */
export async function deleteTemplate(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase not configured');
    }

    try {
        const { error } = await client
            .from('custom_pdf_templates')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[Templates] Failed to delete:', error);
        throw error;
    }
}

/**
 * Permanently delete a template (hard delete)
 */
export async function hardDeleteTemplate(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase not configured');
    }

    try {
        const { error } = await client
            .from('custom_pdf_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[Templates] Failed to hard delete:', error);
        throw error;
    }
}

/**
 * Toggle favorite status
 */
export async function toggleTemplateFavorite(id: string, is_favorite: boolean): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase not configured');
    }

    try {
        const { error } = await client
            .from('custom_pdf_templates')
            .update({ is_favorite })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[Templates] Failed to toggle favorite:', error);
        throw error;
    }
}

/**
 * Increment usage count when template is used
 */
export async function incrementTemplateUsage(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
        // Use RPC call to safely increment
        const { error } = await client.rpc('increment_template_usage', { template_id: id });

        // Fallback to direct update if RPC doesn't exist
        if (error?.code === '42883') { // Function doesn't exist
            const template = await getTemplate(id);
            if (template) {
                await client
                    .from('custom_pdf_templates')
                    .update({ usage_count: (template.usage_count || 0) + 1 })
                    .eq('id', id);
            }
        }

        return true;
    } catch (error) {
        console.warn('[Templates] Failed to increment usage:', error);
        return false;
    }
}

// =================================================================
// Built-in Templates Functions
// =================================================================

/**
 * Fetch all built-in templates (for cloning)
 */
export async function fetchBuiltinTemplates(): Promise<BuiltinTemplate[]> {
    const client = getSupabaseClient();
    if (!client) {
        // Return default built-in templates if no database
        return getDefaultBuiltinTemplates();
    }

    try {
        const { data, error } = await client
            .from('builtin_templates')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data || getDefaultBuiltinTemplates();
    } catch (error) {
        console.error('[Templates] Failed to fetch builtin:', error);
        return getDefaultBuiltinTemplates();
    }
}

/**
 * Clone a built-in template as a custom template
 */
export async function cloneBuiltinTemplate(builtinId: string, newName?: string): Promise<CustomPdfTemplate | null> {
    // First get the built-in template
    const builtins = await fetchBuiltinTemplates();
    const source = builtins.find(t => t.id === builtinId);

    if (!source) {
        throw new Error(`Built-in template ${builtinId} not found`);
    }

    return createTemplate({
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        layout: source.layout,
        sections: source.sections,
        template_type: 'cloned',
        cloned_from: builtinId,
    });
}

/**
 * Default built-in templates (fallback if database not available)
 */
function getDefaultBuiltinTemplates(): BuiltinTemplate[] {
    return [
        {
            id: 'detailed_clinical',
            name: 'Detailed Clinical Report',
            description: 'Comprehensive documentation with all clinical sections',
            layout: 'detailed',
            sections: ['header', 'chief_complaint', 'clinical_notes', 'treatment_plan', 'materials', 'recommendations', 'follow_up', 'signature', 'stamp'],
            icon: '📋',
            sort_order: 1,
            is_active: true,
        },
        {
            id: 'brief_summary',
            name: 'Brief Summary',
            description: 'Quick overview with essential information only',
            layout: 'brief',
            sections: ['header', 'chief_complaint', 'treatment_plan', 'signature'],
            icon: '📝',
            sort_order: 2,
            is_active: true,
        },
        {
            id: 'patient_proforma',
            name: 'Patient Proforma',
            description: 'Simplified cost estimate for patients',
            layout: 'patient',
            sections: ['header', 'treatment_plan', 'materials', 'recommendations', 'signature'],
            icon: '👤',
            sort_order: 3,
            is_active: true,
        },
        {
            id: 'implant_report',
            name: 'Implant Report',
            description: 'Specialized template for implant procedures',
            layout: 'detailed',
            sections: ['header', 'chief_complaint', 'clinical_notes', 'treatment_plan', 'materials', 'follow_up', 'signature'],
            icon: '🦷',
            sort_order: 4,
            is_active: true,
        },
        {
            id: 'veneer_consultation',
            name: 'Veneer Consultation',
            description: 'Cosmetic veneer treatment documentation',
            layout: 'detailed',
            sections: ['header', 'clinical_notes', 'treatment_plan', 'materials', 'recommendations', 'signature'],
            icon: '✨',
            sort_order: 5,
            is_active: true,
        },
    ];
}

// =================================================================
// Version History Functions
// =================================================================

/**
 * Get version history for a template
 */
export async function getTemplateVersionHistory(id: string): Promise<TemplateVersion[]> {
    const template = await getTemplate(id);
    if (!template) return [];
    return template.previous_versions || [];
}

/**
 * Restore a previous version
 */
export async function restoreTemplateVersion(id: string, versionNumber: number): Promise<CustomPdfTemplate | null> {
    const template = await getTemplate(id);
    if (!template) {
        throw new Error('Template not found');
    }

    const version = template.previous_versions?.find(v => v.version === versionNumber);
    if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
    }

    // Update with the old version's content (will trigger version history save)
    return updateTemplate(id, {
        sections: version.sections,
    });
}

// =================================================================
// Export default for convenience
// =================================================================

export default {
    fetch: fetchTemplates,
    get: getTemplate,
    create: createTemplate,
    update: updateTemplate,
    delete: deleteTemplate,
    hardDelete: hardDeleteTemplate,
    toggleFavorite: toggleTemplateFavorite,
    incrementUsage: incrementTemplateUsage,
    fetchBuiltin: fetchBuiltinTemplates,
    cloneBuiltin: cloneBuiltinTemplate,
    getVersionHistory: getTemplateVersionHistory,
    restoreVersion: restoreTemplateVersion,
    SECTION_OPTIONS,
    LAYOUT_OPTIONS,
};
