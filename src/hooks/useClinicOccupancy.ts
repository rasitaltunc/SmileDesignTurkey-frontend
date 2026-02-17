import { useState, useEffect } from 'react';

export type OccupancyMode = 'SCARCITY' | 'BALANCED' | 'OPPORTUNITY';

export interface ClinicOccupancy {
    rate: number; // 0-100
    mode: OccupancyMode;
    label: string;
    color: string;
    pulseSpeed: string; // Tailwind class
}

const DEFAULT_RATE = 87; // High demand by default for demo

export function useClinicOccupancy() {
    const [occupancy, setOccupancy] = useState<ClinicOccupancy>({
        rate: DEFAULT_RATE,
        mode: 'SCARCITY',
        label: 'High Demand',
        color: 'text-rose-500',
        pulseSpeed: 'animate-pulse-fast',
    });

    // Calculate generic mode based on rate
    useEffect(() => {
        let mode: OccupancyMode = 'BALANCED';
        let label = 'Normal Capacity';
        let color = 'text-blue-500';
        let pulseSpeed = 'animate-pulse';

        if (occupancy.rate >= 80) {
            mode = 'SCARCITY';
            label = 'Scarcity Mode';
            color = 'text-rose-500';
            pulseSpeed = 'animate-pulse-fast';
        } else if (occupancy.rate <= 50) {
            mode = 'OPPORTUNITY';
            label = 'Opportunity Mode';
            color = 'text-emerald-500';
            pulseSpeed = 'animate-pulse-slow';
        } else {
            mode = 'BALANCED';
            label = 'Balanced Flow';
            color = 'text-blue-500';
            pulseSpeed = 'animate-pulse';
        }

        setOccupancy(prev => ({
            ...prev,
            mode,
            label,
            color,
            pulseSpeed
        }));
    }, [occupancy.rate]);

    // For Demo: Function to toggle rate
    const setDemoRate = (rate: number) => {
        setOccupancy(prev => ({ ...prev, rate }));
    };

    return {
        occupancy,
        setDemoRate // Exposed for demo controls if needed
    };
}
