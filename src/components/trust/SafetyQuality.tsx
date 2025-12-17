import { Shield, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export function SafetyQuality() {
  const { copy } = useLanguage();

  return (
    <section className="py-16 bg-bg-secondary border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-8">
        <div className="bg-white rounded-lg p-8 border border-gray-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-2">Safety & Quality Standards</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {copy.disclaimer.medical}
              </p>
              {copy.disclaimer.ethics && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {copy.disclaimer.ethics}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-2 pt-4 border-t border-gray-100">
            <AlertCircle className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-tertiary">
              {copy.disclaimer.warranty || 'All treatments are performed by licensed professionals in accredited facilities.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

