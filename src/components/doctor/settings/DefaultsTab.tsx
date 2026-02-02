import { Switch } from '@headlessui/react'; // Assuming headlessui is installed, or use standard checkbox if not available. Use standard to be safe.
// Actually, let's use a standard checkbox with Tailwind styling to avoid potential missing dependency issues if not confirmed.

export default function DefaultsTab({
    settings,
    onSave
}: {
    settings?: any,
    onSave?: (updates: any) => Promise<void>
} = {}) {

    const handleChange = (field: string, value: any) => {
        if (onSave) {
            onSave({ [field]: value });
        }
    };

    return (
        <div className="space-y-8">
            <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Brief Generation</h4>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Default Tone</label>
                        <select
                            value={settings?.default_tone || 'detailed'}
                            onChange={(e) => handleChange('default_tone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="detailed">Detailed (Professional)</option>
                            <option value="brief">Brief (Concise)</option>
                            <option value="patient">Patient-Friendly</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Language</label>
                        <select
                            value={settings?.default_language || 'tr'}
                            onChange={(e) => handleChange('default_language', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="tr">Turkish (TR)</option>
                            <option value="en">English (EN)</option>
                        </select>
                    </div>
                </div>
            </section>

            <div className="border-t border-gray-200"></div>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Materials & Pricing</h4>
                    {/* Show Price Breakdown Toggle */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700">Show Price Breakdown</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings?.show_price_breakdown ?? true}
                                onChange={(e) => handleChange('show_price_breakdown', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Favorite Material</label>
                        <select
                            value={settings?.favorite_material || ''}
                            onChange={(e) => handleChange('favorite_material', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="">Select Material</option>
                            <option value="E-max CAD">E-max CAD</option>
                            <option value="Zirconia (Standard)">Zirconia (Standard)</option>
                            <option value="Zirconia (Premium)">Zirconia (Premium)</option>
                            <option value="Porcelain Fused to Metal">Porcelain Fused to Metal</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Default Pricing Tier</label>
                        <select
                            value={settings?.default_pricing_tier || 'standard'}
                            onChange={(e) => handleChange('default_pricing_tier', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="vip">VIP</option>
                        </select>
                    </div>
                </div>
            </section>
        </div>
    );
}
