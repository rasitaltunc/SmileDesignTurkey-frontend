import React, { useState, useEffect } from 'react';
import { useInputSensitivity } from '@/hooks/useInputSensitivity';
import { ZodSchema } from 'zod';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    schema?: ZodSchema<any>;
    onSensitivityChange?: (score: number) => void;
    // If true, shows a small "pulse" visual when typing flow is smooth
    bionicFeedback?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
    label,
    schema,
    onSensitivityChange,
    bionicFeedback = true,
    className = '',
    onChange,
    onKeyDown,
    value: propValue,
    ...props
}) => {
    const { metrics, handlers } = useInputSensitivity();
    const [error, setError] = useState<string | null>(null);
    const [isValid, setIsValid] = useState(false);
    const [innerValue, setInnerValue] = useState(propValue || '');

    // Sync with prop value if it changes
    useEffect(() => {
        if (propValue !== undefined) {
            setInnerValue(propValue);
        }
    }, [propValue]);

    // Propagate sensitivity score to parent (for Logic Layer)
    useEffect(() => {
        if (onSensitivityChange) {
            onSensitivityChange(metrics.sensitivityScore);
        }
    }, [metrics.sensitivityScore, onSensitivityChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInnerValue(val);
        handlers.onChange(e); // Track dynamics
        if (onChange) {
            onChange(e); // Call original handler
        }

        // Zod Validation
        if (schema) {
            const result = schema.safeParse(val);
            if (result.success) {
                setIsValid(true);
                setError(null);
            } else {
                setIsValid(false);
                // Only show error if length > 3 to avoid annoying early errors
                if (val.length > 3) {
                    setError(result.error.errors[0].message);
                }
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        handlers.onKeyDown(e); // Track hesitation/backspace
        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex justify-between items-center">
                {label && (
                    <label className="block text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                {/* Bionic Feedback: Positive Reinforcement */}
                {bionicFeedback && metrics.wpm > 40 && metrics.sensitivityScore > 80 && (
                    <span className="text-xs text-purple-600 flex items-center gap-1 animate-pulse font-medium">
                        <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" /> Great Flow!
                    </span>
                )}
            </div>

            <div className="relative group">
                <input
                    {...props}
                    value={innerValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className={`
            block w-full rounded-md border shadow-sm sm:text-sm py-2 px-3
            transition-all duration-500
            ${error
                            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                            : isValid
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500' // Neutral state
                        }
            ${/* Amber Glow for Hesitation (Low Sensitivity Score) */ ''}
            ${metrics.sensitivityScore < 50 && (typeof innerValue === 'string' && innerValue.length > 5) ? 'shadow-[0_0_10px_2px_rgba(251,191,36,0.2)] border-amber-300' : ''}
          `}
                />

                {/* Bionic Coaching Tooltip - Appears on Hesitation */}
                {metrics.sensitivityScore < 50 && (typeof innerValue === 'string' && innerValue.length > 5) && (
                    <div className="absolute -top-8 right-0 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded shadow-sm border border-amber-100 opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in slide-in-from-bottom-1 pointer-events-none">
                        Take your time, you're doing great. 🌿
                    </div>
                )}

                {/* Status Icons */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {error && <AlertCircle className="h-5 w-5 text-red-500" />}
                    {isValid && !error && <CheckCircle className="h-5 w-5 text-green-500" />}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-600 mt-1 animate-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
};
