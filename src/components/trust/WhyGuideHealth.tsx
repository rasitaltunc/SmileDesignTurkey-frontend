import { Shield, Award, Heart, CheckCircle, Users, Headphones } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

const iconMap: { [key: string]: any } = {
  Shield: Shield,
  Award: Award,
  Heart: Heart,
  CheckCircle: CheckCircle,
  Users: Users,
  Headphones: Headphones,
};

export function WhyGuideHealth() {
  const { copy } = useLanguage();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-text-primary mb-6 text-3xl font-semibold">{copy.whyUs.title}</h2>
          <p className="text-text-secondary text-lg">
            {copy.whyUs.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {copy.whyUs.points.map((point, idx) => {
            const PointIcon = iconMap[point.icon] || Shield;
            return (
              <div key={idx} className="bg-bg-secondary rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-soft rounded-lg mb-4">
                  <PointIcon className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-text-primary font-semibold mb-2">{point.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{point.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

