import { useState, useEffect, useContext } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NavigationContext } from '@/App';
import { apiJsonAuth } from '@/lib/api';
import { toast } from 'sonner';
import { Settings, Save, Loader2, AlertCircle } from 'lucide-react';

interface DoctorPreferences {
  doctor_id?: string;
  locale: 'en' | 'tr';
  brief_style: 'bullets' | 'detailed';
  tone: 'warm_expert' | 'formal_clinical';
  risk_tolerance: 'conservative' | 'balanced' | 'aggressive';
  specialties: string[];
  preferred_materials: Record<string, any>;
  clinic_protocol_notes: string | null;
}

export default function DoctorSettings() {
  const { role, user } = useAuthStore();
  const { navigate } = useContext(NavigationContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<DoctorPreferences>({
    locale: 'en',
    brief_style: 'bullets',
    tone: 'warm_expert',
    risk_tolerance: 'balanced',
    specialties: [],
    preferred_materials: {},
    clinic_protocol_notes: null,
  });

  const [specialtyInput, setSpecialtyInput] = useState('');
  const [materialsJson, setMaterialsJson] = useState('{}');

  // Redirect if not doctor
  useEffect(() => {
    if (role && role !== 'doctor') {
      navigate('/');
    }
  }, [role, navigate]);

  // Load preferences on mount
  useEffect(() => {
    if (role === 'doctor' && user) {
      loadPreferences();
    }
  }, [role, user]);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiJsonAuth<{ ok: true; preferences: DoctorPreferences }>(
        '/api/doctor/preferences'
      );

      if (result.ok && result.preferences) {
        setPreferences(result.preferences);
        setMaterialsJson(
          JSON.stringify(result.preferences.preferred_materials || {}, null, 2)
        );
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate materials JSON
      let materialsParsed = {};
      try {
        materialsParsed = JSON.parse(materialsJson);
      } catch (jsonErr) {
        setError('Invalid JSON in Preferred Materials field');
        toast.error('Invalid JSON in Preferred Materials field');
        setIsSaving(false);
        return;
      }

      const payload = {
        locale: preferences.locale,
        brief_style: preferences.brief_style,
        tone: preferences.tone,
        risk_tolerance: preferences.risk_tolerance,
        specialties: preferences.specialties,
        preferred_materials: materialsParsed,
        clinic_protocol_notes: preferences.clinic_protocol_notes || null,
      };

      const result = await apiJsonAuth<{ ok: true; preferences: DoctorPreferences }>(
        '/api/doctor/preferences',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (result.ok) {
        toast.success('Preferences saved successfully');
        setPreferences(result.preferences);
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preferences';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const addSpecialty = () => {
    const trimmed = specialtyInput.trim();
    if (trimmed && !preferences.specialties.includes(trimmed)) {
      setPreferences({
        ...preferences,
        specialties: [...preferences.specialties, trimmed],
      });
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setPreferences({
      ...preferences,
      specialties: preferences.specialties.filter((s) => s !== specialty),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-6 h-6 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Doctor Settings</h1>
          </div>
          <p className="text-gray-600">Configure your preferences for AI-generated briefs and notes</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Locale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language / Locale
            </label>
            <select
              value={preferences.locale}
              onChange={(e) =>
                setPreferences({ ...preferences, locale: e.target.value as 'en' | 'tr' })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="en">English (EN)</option>
              <option value="tr">Türkçe (TR)</option>
            </select>
          </div>

          {/* Brief Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brief Style
            </label>
            <select
              value={preferences.brief_style}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  brief_style: e.target.value as 'bullets' | 'detailed',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="bullets">Bullet Points</option>
              <option value="detailed">Detailed Paragraphs</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              How you prefer AI briefs to be formatted
            </p>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Communication Tone
            </label>
            <select
              value={preferences.tone}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  tone: e.target.value as 'warm_expert' | 'formal_clinical',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="warm_expert">Warm & Expert</option>
              <option value="formal_clinical">Formal & Clinical</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Tone used in AI-generated content
            </p>
          </div>

          {/* Risk Tolerance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Tolerance
            </label>
            <select
              value={preferences.risk_tolerance}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  risk_tolerance: e.target.value as 'conservative' | 'balanced' | 'aggressive',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Risk assessment approach in AI briefs
            </p>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialties
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                placeholder="Add specialty (e.g., Implantology, Orthodontics)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={addSpecialty}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {preferences.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {preferences.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="hover:text-teal-900 font-medium"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preferred Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Materials (JSON)
            </label>
            <textarea
              value={materialsJson}
              onChange={(e) => setMaterialsJson(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder='{"zirconia": "3M Lava", "e-max": "Ivoclar IPS e.max", "implant": "Straumann"}'
            />
            <p className="mt-1 text-sm text-gray-500">
              JSON object with preferred materials (e.g., zirconia, e-max, implant brands)
            </p>
          </div>

          {/* Clinic Protocol Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic Protocol Notes
            </label>
            <textarea
              value={preferences.clinic_protocol_notes || ''}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  clinic_protocol_notes: e.target.value || null,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Any specific clinic protocols or notes for AI to consider..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Additional context for AI-generated content
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

