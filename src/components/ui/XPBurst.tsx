import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Zap } from 'lucide-react';

interface XPBurstProps {
    amount?: number;
    label?: string;
    onComplete?: () => void;
}

export function XPBurst({ amount = 10, label = 'Trust Score', onComplete }: XPBurstProps) {
    useEffect(() => {
        // Trigger confetti
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 9999,
        };

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
            });
        }

        fire(0.25, {
            spread: 26,
            startVelocity: 55,
            colors: ['#F59E0B', '#FCD34D'] // Amber/Gold
        });

        fire(0.2, {
            spread: 60,
            colors: ['#10B981', '#34D399'] // Emerald
        });

        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8,
            colors: ['#F59E0B', '#10B981']
        });

        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2,
            colors: ['#F59E0B']
        });

        fire(0.1, {
            spread: 120,
            startVelocity: 45,
            colors: ['#10B981']
        });

        // Play success sound
        const playSound = () => {
            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContext) return;

                const ctx = new AudioContext();
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                // "Coin" sound effect (High C -> E)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                oscillator.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5

                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.5);
            } catch (e) {
                console.error('Audio playback failed', e);
            }
        };

        playSound();

        // Cleanup after animation duration
        const timer = setTimeout(() => {
            onComplete?.();
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed bottom-12 right-12 z-[9999] pointer-events-none animate-bounce-in-up">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-md transform hover:scale-105 transition-transform duration-300">
                <div className="bg-white/20 p-2 rounded-full">
                    <Zap className="w-6 h-6 text-white fill-white animate-pulse" />
                </div>
                <div>
                    <div className="text-2xl font-black tracking-tighter leading-none">
                        +{amount} XP
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                        {label}
                    </div>
                </div>
            </div>

            {/* Shiny effect overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 animate-shimmer" />
        </div>
    );
}
