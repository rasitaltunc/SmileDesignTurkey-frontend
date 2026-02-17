import React, { createContext, useContext, useEffect, useRef } from 'react';

type SoundType = 'success' | 'error' | 'click' | 'notification' | 'lock-in' | 'hover';

interface SoundContextType {
    playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext on first user interaction to handle autoplay policies
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
        };

        window.addEventListener('click', initAudio, { once: true });
        return () => window.removeEventListener('click', initAudio);
    }, []);

    const playSound = (type: SoundType) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        // Resume context if suspended
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'success':
                // "Thrum" - Low swelling chord
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(220, now);
                oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.1);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                oscillator.start(now);
                oscillator.stop(now + 0.6);

                // Add a second harmonic for richness
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.setValueAtTime(330, now); // E4
                gain2.gain.setValueAtTime(0, now);
                gain2.gain.linearRampToValueAtTime(0.1, now + 0.1);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                osc2.start(now);
                osc2.stop(now + 0.6);
                break;

            case 'error':
                // "Glass Tap" - Sharp, high tick
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(800, now);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;

            case 'click':
            case 'hover':
                // Micro-tick - Almost imperceptible
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, now);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;

            case 'lock-in':
                // Mechanical Lock
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(150, now);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'notification':
                // Soft Bell
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
                oscillator.start(now);
                oscillator.stop(now + 1.5);

                // Bell Harmonic
                const bellHigh = ctx.createOscillator();
                const bellGain = ctx.createGain();
                bellHigh.connect(bellGain);
                bellGain.connect(ctx.destination);
                bellHigh.frequency.setValueAtTime(1046.50, now); // C6
                bellGain.gain.setValueAtTime(0, now);
                bellGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
                bellGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                bellHigh.start(now);
                bellHigh.stop(now + 1.0);
                break;
        }
    };

    return (
        <SoundContext.Provider value={{ playSound }}>
            {children}
        </SoundContext.Provider>
    );
};
