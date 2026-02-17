import React from 'react';

interface AmbientBackgroundProps {
    variant?: 'patient' | 'doctor';
}

/**
 * AmbientBackground — Creates the immersive floating-orb environment
 * Pure CSS animations, zero JavaScript overhead
 */
export function AmbientBackground({ variant = 'patient' }: AmbientBackgroundProps) {
    const isDoctor = variant === 'doctor';

    return (
        <div className={`hub-ambient ${isDoctor ? 'hub-ambient--doctor' : ''}`} aria-hidden="true">
            {/* Gradient orbs */}
            <div className={`hub-orb hub-orb--1 ${isDoctor ? 'hub-orb--doctor-1' : ''}`} />
            <div className={`hub-orb hub-orb--2 ${isDoctor ? 'hub-orb--doctor-2' : ''}`} />
            <div className={`hub-orb hub-orb--3 ${isDoctor ? 'hub-orb--doctor-3' : ''}`} />
            <div className={`hub-orb hub-orb--4 ${isDoctor ? 'hub-orb--doctor-4' : ''}`} />

            {/* Floating particles */}
            <div className="hub-particles">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="hub-particle" />
                ))}
            </div>
        </div>
    );
}
