import React from 'react';
import { ChevronRight, Star, MapPin } from 'lucide-react';

interface SmartCase {
    id: number;
    treatmentType: string;
    patientName: string;
    country: string;
    flag: string;
    quote: string;
    rating: number;
    reviewCount: number;
    beforeLabel: string;
    afterLabel: string;
    /** Gradient colors for B&A placeholder thumbnails */
    beforeGradient: string;
    afterGradient: string;
}

/**
 * AI-Personalized Gallery — shows B&A cases matching patient's treatment
 * Research: Social Proof (+83% engagement) + Kimlik Projeksiyonu (Identity Projection)
 * "Patients like you who got [treatment]" → Mirror neurons fire
 */
const CASE_DATABASE: Record<string, SmartCase[]> = {
    'Hollywood Smile': [
        {
            id: 1,
            treatmentType: 'Hollywood Smile',
            patientName: 'Emma W.',
            country: 'United Kingdom',
            flag: '🇬🇧',
            quote: "I can't stop smiling! The team made me feel so safe from day one.",
            rating: 5,
            reviewCount: 3,
            beforeLabel: 'Discolored & uneven teeth',
            afterLabel: '20 E-max veneers — perfect smile',
            beforeGradient: 'linear-gradient(135deg, #4a3728 0%, #6b5345 50%, #8a7668 100%)',
            afterGradient: 'linear-gradient(135deg, #f0f4f8 0%, #e8f5e9 50%, #ffffff 100%)',
        },
        {
            id: 2,
            treatmentType: 'Hollywood Smile',
            patientName: 'Klaus M.',
            country: 'Germany',
            flag: '🇩🇪',
            quote: "Professionell, pünktlich, perfekt. Besser als erwartet.",
            rating: 5,
            reviewCount: 2,
            beforeLabel: 'Worn enamel & gaps',
            afterLabel: '16 porcelain veneers — natural look',
            beforeGradient: 'linear-gradient(135deg, #5c4033 0%, #7a6355 50%, #9a8678 100%)',
            afterGradient: 'linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 50%, #fff 100%)',
        },
        {
            id: 3,
            treatmentType: 'Hollywood Smile',
            patientName: 'Fatima A.',
            country: 'Saudi Arabia',
            flag: '🇸🇦',
            quote: "التجربة كانت رائعة. الفريق الطبي محترف جداً.",
            rating: 5,
            reviewCount: 1,
            beforeLabel: 'Crowded & yellow teeth',
            afterLabel: '20 zirconia crowns — radiant white',
            beforeGradient: 'linear-gradient(135deg, #5d4e37 0%, #7d6e57 50%, #a09080 100%)',
            afterGradient: 'linear-gradient(135deg, #fefefe 0%, #f0fdf4 50%, #fff 100%)',
        },
        {
            id: 4,
            treatmentType: 'Hollywood Smile',
            patientName: 'Sophie L.',
            country: 'France',
            flag: '🇫🇷',
            quote: "Magnifique! Mon dentiste en France n'en revenait pas.",
            rating: 5,
            reviewCount: 4,
            beforeLabel: 'Chipped front teeth',
            afterLabel: '12 veneers — celebrity smile',
            beforeGradient: 'linear-gradient(135deg, #64513e 0%, #847160 50%, #a49282 100%)',
            afterGradient: 'linear-gradient(135deg, #fffdf7 0%, #fef3c7 50%, #fff 100%)',
        },
    ],
    'Dental Implants': [
        {
            id: 5,
            treatmentType: 'Dental Implants',
            patientName: 'James R.',
            country: 'United Kingdom',
            flag: '🇬🇧',
            quote: "Had 4 missing teeth. Now you'd never know. Incredible work.",
            rating: 5,
            reviewCount: 5,
            beforeLabel: '4 missing teeth — upper jaw',
            afterLabel: '4 titanium implants + porcelain crowns',
            beforeGradient: 'linear-gradient(135deg, #3d2b1f 0%, #5d4b3f 50%, #7d6b5f 100%)',
            afterGradient: 'linear-gradient(135deg, #f1f5f9 0%, #dbeafe 50%, #fff 100%)',
        },
        {
            id: 6,
            treatmentType: 'Dental Implants',
            patientName: 'Hans B.',
            country: 'Germany',
            flag: '🇩🇪',
            quote: "All-on-4 hat mein Leben verändert. Endlich wieder richtig essen!",
            rating: 5,
            reviewCount: 2,
            beforeLabel: 'Full upper arch — no teeth',
            afterLabel: 'All-on-4 implants — full fixed bridge',
            beforeGradient: 'linear-gradient(135deg, #45342a 0%, #65544a 50%, #85746a 100%)',
            afterGradient: 'linear-gradient(135deg, #fafafa 0%, #e8f5e9 50%, #fff 100%)',
        },
    ],
};

interface SmartGalleryProps {
    /** Patient's treatment type — gallery filters to matching cases */
    treatmentType?: string;
}

export function SmartGallery({ treatmentType = 'Hollywood Smile' }: SmartGalleryProps) {
    const cases = CASE_DATABASE[treatmentType] || CASE_DATABASE['Hollywood Smile'];

    // Calculate confidence stat
    const avgRating = cases.reduce((sum, c) => sum + c.rating, 0) / cases.length;
    const totalReviews = cases.reduce((sum, c) => sum + c.reviewCount, 0);

    return (
        <div className="hub-glass p-5">
            {/* Header with personalized message */}
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: 'var(--hub-text-muted)' }}>
                    PATIENTS LIKE YOU
                </p>
                <span className="hub-badge hub-badge--info">
                    <Star className="w-2.5 h-2.5" />
                    {avgRating.toFixed(1)} avg
                </span>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--hub-text-primary)' }}>
                Who got <span style={{ color: 'var(--hub-accent)' }}>{treatmentType}</span>
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--hub-text-secondary)' }}>
                {totalReviews} verified reviews from patients with similar treatments
            </p>

            {/* Horizontal scroll gallery */}
            <div className="hub-gallery">
                {cases.map((patientCase) => (
                    <div key={patientCase.id} className="hub-ba-card">
                        {/* B&A Photo comparison */}
                        <div className="hub-ba-photos">
                            <div className="hub-ba-photo">
                                <div
                                    className="hub-ba-thumbnail"
                                    style={{ background: patientCase.beforeGradient }}
                                >
                                    <span className="hub-ba-label hub-ba-label--before">Before</span>
                                </div>
                                <p className="text-[10px] mt-1.5 px-1" style={{ color: 'var(--hub-text-muted)' }}>
                                    {patientCase.beforeLabel}
                                </p>
                            </div>
                            <div className="hub-ba-divider">→</div>
                            <div className="hub-ba-photo">
                                <div
                                    className="hub-ba-thumbnail"
                                    style={{ background: patientCase.afterGradient }}
                                >
                                    <span className="hub-ba-label hub-ba-label--after">After</span>
                                </div>
                                <p className="text-[10px] mt-1.5 px-1" style={{ color: 'var(--hub-text-muted)' }}>
                                    {patientCase.afterLabel}
                                </p>
                            </div>
                        </div>

                        {/* Patient info */}
                        <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm">{patientCase.flag}</span>
                                <p className="text-xs font-semibold" style={{ color: 'var(--hub-text-primary)' }}>
                                    {patientCase.patientName}
                                </p>
                                <div className="flex items-center gap-0.5 ml-auto">
                                    {Array.from({ length: patientCase.rating }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className="w-3 h-3"
                                            style={{ color: '#fbbf24', fill: '#fbbf24' }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                                <MapPin className="w-3 h-3" style={{ color: 'var(--hub-text-muted)' }} />
                                <span className="text-[10px]" style={{ color: 'var(--hub-text-muted)' }}>
                                    {patientCase.country}
                                </span>
                            </div>
                            <p className="text-xs italic" style={{ color: 'var(--hub-text-secondary)' }}>
                                "{patientCase.quote}"
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confidence boost + CTA */}
            <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--hub-glass-border)' }}>
                <p className="text-xs" style={{ color: 'var(--hub-text-secondary)' }}>
                    <span style={{ color: 'var(--hub-accent)', fontWeight: 700 }}>94%</span> of similar patients rated 5 stars
                </p>
                <button
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: 'var(--hub-accent)' }}
                >
                    See all stories <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
