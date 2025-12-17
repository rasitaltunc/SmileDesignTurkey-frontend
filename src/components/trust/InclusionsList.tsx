import { Check, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export function InclusionsList() {
  const { copy } = useLanguage();

  if (!copy.inclusionsList || copy.inclusionsList.categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-gray-900 mb-4 text-3xl font-semibold">
            {copy.inclusionsList.title}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            {copy.inclusionsList.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {copy.inclusionsList.categories.map((category, index) => {
            const IconComponent = Check;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="text-gray-900 font-semibold">{category.title}</h3>
                </div>
                <ul className="space-y-2">
                  {category.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {copy.inclusionsList.note && (
          <div className="bg-teal-50 rounded-lg p-6 border border-teal-200 text-center">
            <p className="text-gray-700 text-sm">
              <strong className="text-teal-700">{copy.inclusionsList.note}</strong>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

