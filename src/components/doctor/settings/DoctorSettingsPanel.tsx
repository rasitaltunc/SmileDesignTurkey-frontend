import { useState, useEffect, useCallback } from 'react';
import {
    User,
    PenTool,
    FileText,
    Settings,
    Network,
    Save,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import SignatureTab from './SignatureTab';

// Tabs configuration
const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'signature', label: 'Signature & Stamp', icon: PenTool },
    { id: 'templates', label: 'PDF Templates', icon: FileText },
    { id: 'defaults', label: 'Defaults', icon: Settings },
    { id: 'integrations', label: 'Integrations', icon: Network },
] as const;

type TabId = typeof TABS[number]['id'];

export default function DoctorSettingsPanel() {
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [settings, setSettings] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore();
    const supabase = getSupabaseClient();

    // Fetch settings on mount
    useEffect(() => {
        async function fetchSettings() {
            if (!user || !supabase) return;
            try {
                const { data, error } = await supabase
                    .from('doctor_settings')
                    .select('*')
                    .eq('doctor_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is "not found", which is fine for first load
                    console.error('Error fetching settings:', error);
                    toast.error('Failed to load settings');
                }

                if (data) {
                    setSettings(data);
                } else {
                    // Initial create if not exists
                    const { data: newData, error: createError } = await supabase
                        .from('doctor_settings')
                        .insert([{ doctor_id: user.id }])
                        .select()
                        .single();

                    if (newData) setSettings(newData);
                }
            } catch (err) {
                console.error('Settings fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchSettings();
    }, [user, supabase]);

    // Generic save handler (Upsert)
    const handleSaveSettings = useCallback(async (updates: Partial<typeof settings>) => {
        if (!user || !supabase) return;

        // Optimistic update
        setSettings((prev: any) => ({ ...prev, ...updates }));

        try {
            const { error } = await supabase
                .from('doctor_settings')
                .upsert({
                    doctor_id: user.id,
                    updated_at: new Date().toISOString(),
                    ...settings, // include existing
                    ...updates   // overwrite with new
                });

            if (error) throw error;
            // toast.success('Saved'); // Optional: Too noisy for text inputs, good for buttons
        } catch (err) {
            console.error('Error saving settings:', err);
            toast.error('Failed to save changes');
        }
    }, [user, supabase, settings]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-white rounded-xl border border-gray-200">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] overflow-hidden">
            {/* Sidebar / Tabs */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">Doctor Settings</h2>
                    <p className="text-sm text-gray-500">Manage your workspace</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-teal-50 text-teal-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-200 bg-white">
                    <h3 className="text-xl font-bold text-gray-900">
                        {TABS.find(t => t.id === activeTab)?.label}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure your {activeTab} settings and preferences
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl space-y-8">
                        {activeTab === 'profile' && <ProfileTab settings={settings} onSave={handleSaveSettings} />}
                        {activeTab === 'signature' && <SignatureTab settings={settings} onSave={handleSaveSettings} />}
                        {activeTab === 'templates' && <TemplatesTab settings={settings} onSave={handleSaveSettings} />}
                        {activeTab === 'defaults' && <DefaultsTab settings={settings} onSave={handleSaveSettings} />}
                        {activeTab === 'integrations' && <IntegrationsTab settings={settings} onSave={handleSaveSettings} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --- Placeholder Components for Tabs (Will be separate files later) --- */

function ProfileTab({ settings, onSave }: { settings: any, onSave: (updates: any) => void }) {
    const { user } = useAuthStore();
    const displayName = user?.user_metadata?.full_name || user?.email;

    const handleBlur = (field: string, value: string) => {
        if (settings[field] !== value) {
            onSave({ [field]: value });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        "👤"
                    )}
                </div>
                <div>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        Change Avatar (Coming Soon)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        type="text"
                        defaultValue={displayName}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <input
                        type="text"
                        defaultValue="Doctor"
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Specialization</label>
                    <input
                        type="text"
                        placeholder="e.g. Prosthodontics"
                        defaultValue={settings.specialization || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        onBlur={(e) => handleBlur('specialization', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">License Number</label>
                    <input
                        type="text"
                        placeholder="e.g. 12345XX"
                        defaultValue={settings.license_number || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        onBlur={(e) => handleBlur('license_number', e.target.value)}
                    />
                </div>
                <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                        rows={4}
                        placeholder="Brief professional biography..."
                        defaultValue={settings.bio || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        onBlur={(e) => handleBlur('bio', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}



function TemplatesTab({ settings, onSave }: { settings: any, onSave: (updates: any) => void }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {['Detailed Clinical', 'Brief Summary', 'Patient Copy'].map((name) => (
                    <div key={name} className="relative flex items-start p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all border-gray-200">
                        <div className="min-w-0 flex-1 text-sm">
                            <label className="font-medium text-gray-900 select-none cursor-pointer">
                                {name}
                            </label>
                            <p className="text-gray-500">Standard template layout with full medical details.</p>
                        </div>
                        <div className="ml-3 flex items-center h-5">
                            <input
                                type="radio"
                                name="template"
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

function DefaultsTab({ settings, onSave }: { settings: any, onSave: (updates: any) => void }) {
    return (
        <div className="space-y-8">
            <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Brief Generation</h4>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Default Tone</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option>Detailed (Professional)</option>
                            <option>Brief (Concise)</option>
                            <option>Patient-Friendly</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Language</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option>Turkish (TR)</option>
                            <option>English (EN)</option>
                        </select>
                    </div>
                </div>
            </section>

            <div className="border-t border-gray-200"></div>

            <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Materials & Pricing</h4>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Favorite Material</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option>E-max CAD</option>
                            <option>Zirconia (Standard)</option>
                            <option>Zirconia (Premium)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Pricing Tier</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option>Standard</option>
                            <option>Premium</option>
                            <option>VIP</option>
                        </select>
                    </div>
                </div>
            </section>
        </div>
    );
}

function IntegrationsTab({ settings, onSave }: { settings: any, onSave: (updates: any) => void }) {
    return (
        <div className="space-y-6">
            {/* WhatsApp */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">📱</div>
                    <div>
                        <h4 className="font-semibold text-gray-900">WhatsApp Business</h4>
                        <p className="text-sm text-gray-500">Connect to send automated reminders</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Connect
                </button>
            </div>

            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">📅</div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Google Calendar</h4>
                        <p className="text-sm text-gray-500">Sync appointments effortlessly</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Connect
                </button>
            </div>
        </div>
    );
}
