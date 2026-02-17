import React, { useState } from 'react';
import {
    Check,
    X,
    Crown,
    Star,
    Sparkles,
    HeartPulse,
    Shield,
    Clock,
    Users,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface PackageFeature {
    label: string;
    comfort: string | boolean;
    signature: string | boolean;
    vip: string | boolean;
}

interface PackageTier {
    id: 'comfort' | 'signature' | 'vip';
    name: string;
    tagline: string;
    price: number;
    originalPrice?: number;
    badge?: string;
    icon: React.ReactNode;
    highlight: boolean;
    socialProof?: string;
}

const TIERS: PackageTier[] = [
    {
        id: 'comfort',
        name: 'Comfort',
        tagline: 'Quality care, smart price',
        price: 2890,
        icon: <Star className="w-5 h-5" />,
        highlight: false,
    },
    {
        id: 'signature',
        name: 'Signature',
        tagline: 'The complete experience',
        price: 4490,
        originalPrice: 5200,
        badge: 'MOST POPULAR',
        icon: <Sparkles className="w-5 h-5" />,
        highlight: true,
        socialProof: 'Chosen by 73% of UK & DE patients',
    },
    {
        id: 'vip',
        name: 'VIP Elite',
        tagline: 'Luxury from landing to lift-off',
        price: 7990,
        icon: <Crown className="w-5 h-5" />,
        highlight: false,
        socialProof: 'Our premium experience',
    },
];

const FEATURES: PackageFeature[] = [
    { label: 'Treatment & Materials', comfort: true, signature: true, vip: true },
    { label: 'Panoramic X-ray', comfort: true, signature: true, vip: true },
    { label: 'Airport Transfer', comfort: false, signature: '✓ Shared', vip: '✓ Private car' },
    { label: 'Hotel Stay', comfort: '3★ Standard', signature: '4★ Boutique', vip: '5★ Suite' },
    { label: 'Aftercare Support', comfort: 'Email only', signature: 'WhatsApp 24/7', vip: 'Personal nurse' },
    { label: 'Warranty', comfort: '2 years', signature: '5 years', vip: 'Lifetime' },
    { label: 'VIP Lounge Access', comfort: false, signature: false, vip: true },
    { label: 'City Tour', comfort: false, signature: '½ day', vip: 'Full day private' },
    { label: 'Priority Scheduling', comfort: false, signature: true, vip: true },
    { label: 'Post-treatment Check-up', comfort: '1× remote', signature: '3× remote', vip: 'Unlimited + in-person' },
];

interface PackageSelectorProps {
    treatmentType?: string;
    onSelect?: (tier: 'comfort' | 'signature' | 'vip') => void;
}

export function PackageSelector({
    treatmentType = 'Hollywood Smile',
    onSelect,
}: PackageSelectorProps) {
    const [selectedTier, setSelectedTier] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState(false);

    const handleSelect = (tierId: 'comfort' | 'signature' | 'vip') => {
        setSelectedTier(tierId);
        onSelect?.(tierId);
    };

    return (
        <div className="hub-glass p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--hub-text-muted)' }}>
                        YOUR PACKAGE
                    </p>
                    <h3 className="text-base font-bold mt-0.5" style={{ color: 'var(--hub-text-primary)' }}>
                        {treatmentType} Packages
                    </h3>
                </div>
                <div className="hub-badge hub-badge--info">
                    <Shield className="w-3 h-3 mr-1 inline" />
                    All-inclusive
                </div>
            </div>
            <p className="text-xs mb-5" style={{ color: 'var(--hub-text-secondary)' }}>
                Every package includes your treatment. Choose the experience level that feels right.
            </p>

            {/* Tier Cards */}
            <div className="hub-package-grid">
                {TIERS.map((tier) => (
                    <div
                        key={tier.id}
                        className={`hub-package-card ${tier.highlight ? 'hub-package-card--highlight' : ''} ${selectedTier === tier.id ? 'hub-package-card--selected' : ''}`}
                        onClick={() => handleSelect(tier.id)}
                        role="button"
                        tabIndex={0}
                    >
                        {/* Popular badge */}
                        {tier.badge && (
                            <div className="hub-package-badge">
                                {tier.badge}
                            </div>
                        )}

                        {/* Icon & Name */}
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{
                                    background: tier.highlight
                                        ? 'var(--hub-accent)'
                                        : tier.id === 'vip'
                                            ? 'rgba(234, 179, 8, 0.15)'
                                            : 'rgba(255,255,255,0.06)',
                                    color: tier.highlight
                                        ? 'white'
                                        : tier.id === 'vip'
                                            ? '#eab308'
                                            : 'var(--hub-text-secondary)',
                                }}
                            >
                                {tier.icon}
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--hub-text-primary)' }}>
                                    {tier.name}
                                </p>
                                <p className="text-[10px]" style={{ color: 'var(--hub-text-muted)' }}>
                                    {tier.tagline}
                                </p>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="mb-3">
                            {tier.originalPrice && (
                                <span
                                    className="text-xs line-through mr-2"
                                    style={{ color: 'var(--hub-text-muted)' }}
                                >
                                    €{tier.originalPrice.toLocaleString()}
                                </span>
                            )}
                            <span className="text-xl font-bold" style={{
                                color: tier.highlight ? 'var(--hub-accent)' : 'var(--hub-text-primary)',
                            }}>
                                €{tier.price.toLocaleString()}
                            </span>
                        </div>

                        {/* Key features */}
                        <div className="space-y-1.5 mb-3">
                            {FEATURES.slice(0, 5).map((f) => {
                                const val = f[tier.id];
                                const included = val === true || (typeof val === 'string' && val.startsWith('✓'));
                                const hasValue = val !== false;
                                return (
                                    <div key={f.label} className="flex items-center gap-2">
                                        {hasValue ? (
                                            <Check className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--hub-accent)' }} />
                                        ) : (
                                            <X className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--hub-text-muted)', opacity: 0.4 }} />
                                        )}
                                        <span
                                            className="text-[11px]"
                                            style={{
                                                color: hasValue ? 'var(--hub-text-secondary)' : 'var(--hub-text-muted)',
                                                opacity: hasValue ? 1 : 0.5,
                                            }}
                                        >
                                            {typeof val === 'string' ? val.replace('✓ ', '') : f.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Social proof */}
                        {tier.socialProof && (
                            <div className="flex items-center gap-1.5 mb-3">
                                <Users className="w-3 h-3" style={{ color: 'var(--hub-info)' }} />
                                <span className="text-[10px] italic" style={{ color: 'var(--hub-info)' }}>
                                    {tier.socialProof}
                                </span>
                            </div>
                        )}

                        {/* Select button */}
                        <button
                            className="hub-package-btn w-full"
                            style={{
                                background: selectedTier === tier.id
                                    ? 'var(--hub-accent)'
                                    : tier.highlight
                                        ? 'var(--hub-accent)'
                                        : 'var(--hub-glass-bg)',
                                color: (selectedTier === tier.id || tier.highlight) ? 'white' : 'var(--hub-text-secondary)',
                                border: `1px solid ${(selectedTier === tier.id || tier.highlight) ? 'var(--hub-accent)' : 'var(--hub-glass-border)'}`,
                            }}
                        >
                            {selectedTier === tier.id ? '✓ Selected' : tier.highlight ? 'Choose Signature' : `Choose ${tier.name}`}
                        </button>
                    </div>
                ))}
            </div>

            {/* Compare all features accordion */}
            <button
                className="w-full flex items-center justify-center gap-2 mt-4 py-2 text-xs font-medium"
                style={{ color: 'var(--hub-text-secondary)' }}
                onClick={() => setShowComparison(!showComparison)}
            >
                {showComparison ? 'Hide' : 'Compare all features'}
                {showComparison ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Full comparison table */}
            <div
                className="hub-timeline-detail"
                style={{
                    maxHeight: showComparison ? '600px' : '0',
                    opacity: showComparison ? 1 : 0,
                    marginTop: showComparison ? '8px' : '0',
                }}
            >
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--hub-glass-border)' }}
                >
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--hub-glass-border)' }}>
                                <th className="text-left p-2.5 font-medium" style={{ color: 'var(--hub-text-muted)' }}>
                                    Feature
                                </th>
                                <th className="text-center p-2.5 font-medium" style={{ color: 'var(--hub-text-secondary)' }}>
                                    Comfort
                                </th>
                                <th
                                    className="text-center p-2.5 font-bold"
                                    style={{ color: 'var(--hub-accent)', background: 'rgba(20,184,166,0.04)' }}
                                >
                                    Signature ⭐
                                </th>
                                <th className="text-center p-2.5 font-medium" style={{ color: '#eab308' }}>
                                    VIP Elite
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {FEATURES.map((f, i) => (
                                <tr
                                    key={f.label}
                                    style={{
                                        borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                    }}
                                >
                                    <td className="p-2.5" style={{ color: 'var(--hub-text-secondary)' }}>
                                        {f.label}
                                    </td>
                                    {(['comfort', 'signature', 'vip'] as const).map((tid) => {
                                        const val = f[tid];
                                        return (
                                            <td
                                                key={tid}
                                                className="text-center p-2.5"
                                                style={{
                                                    background: tid === 'signature' ? 'rgba(20,184,166,0.04)' : undefined,
                                                    color: val === false
                                                        ? 'var(--hub-text-muted)'
                                                        : val === true
                                                            ? 'var(--hub-accent)'
                                                            : 'var(--hub-text-secondary)',
                                                }}
                                            >
                                                {val === true ? (
                                                    <Check className="w-3.5 h-3.5 inline" style={{ color: 'var(--hub-accent)' }} />
                                                ) : val === false ? (
                                                    <span style={{ opacity: 0.3 }}>—</span>
                                                ) : (
                                                    val
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Trust footer */}
            <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3" style={{ color: 'var(--hub-accent)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--hub-text-muted)' }}>No hidden fees</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" style={{ color: 'var(--hub-info)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--hub-text-muted)' }}>Free cancellation 48h</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <HeartPulse className="w-3 h-3" style={{ color: '#f43f5e' }} />
                    <span className="text-[10px]" style={{ color: 'var(--hub-text-muted)' }}>JCI accredited clinics</span>
                </div>
            </div>
        </div>
    );
}
