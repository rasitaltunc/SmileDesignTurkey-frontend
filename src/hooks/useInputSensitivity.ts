import { useState, useRef, useCallback } from 'react';

export interface SensitivityMetrics {
    wpm: number;
    backspaceCount: number;
    hesitationCount: number; // Pauses > 1000ms
    sensitivityScore: number; // 0-100 (100 = smooth flow, <50 = erratic)
}

export const useInputSensitivity = () => {
    const [metrics, setMetrics] = useState<SensitivityMetrics>({
        wpm: 0,
        backspaceCount: 0,
        hesitationCount: 0,
        sensitivityScore: 100,
    });

    const lastKeystrokeTime = useRef<number>(Date.now());
    const startTime = useRef<number>(Date.now());
    const charCount = useRef<number>(0);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const now = Date.now();
        const timeSinceLastKey = now - lastKeystrokeTime.current;

        // Detect Hesitation (Pause > 1000ms within a session)
        if (timeSinceLastKey > 1000 && charCount.current > 0) {
            setMetrics((prev) => ({
                ...prev,
                hesitationCount: prev.hesitationCount + 1,
            }));
        }

        // Detect Backspace (Correction/Hesitation)
        if (e.key === 'Backspace') {
            setMetrics((prev) => ({
                ...prev,
                backspaceCount: prev.backspaceCount + 1,
            }));
        }

        lastKeystrokeTime.current = now;
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const now = Date.now();
        charCount.current = e.target.value.length;

        // Calculate WPM
        const durationInMinutes = (now - startTime.current) / 60000;
        const words = charCount.current / 5; // Standard: 5 chars = 1 word
        const wpm = durationInMinutes > 0 ? Math.round(words / durationInMinutes) : 0;

        // Calculate Sensitivity Score (Simple Heuristic for now)
        // Starts at 100, drops with hesitations and excessive backspaces
        setMetrics((prev) => {
            const penalty = (prev.backspaceCount * 2) + (prev.hesitationCount * 5);
            const rawScore = 100 - penalty;
            return {
                ...prev,
                wpm,
                sensitivityScore: Math.max(0, rawScore),
            };
        });
    }, []);

    const resetMetrics = useCallback(() => {
        startTime.current = Date.now();
        lastKeystrokeTime.current = Date.now();
        charCount.current = 0;
        setMetrics({
            wpm: 0,
            backspaceCount: 0,
            hesitationCount: 0,
            sensitivityScore: 100,
        });
    }, []);

    return {
        metrics,
        handlers: {
            onKeyDown: handleKeyDown,
            onChange: handleChange,
        },
        resetMetrics,
    };
};
