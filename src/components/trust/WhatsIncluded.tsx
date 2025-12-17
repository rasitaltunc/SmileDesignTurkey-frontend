import { CheckCircle, Hotel, Plane, Video, Heart } from 'lucide-react';

const includedItems = [
  { icon: Video, title: 'Free Consultation', description: 'Video consultation with our care coordinator' },
  { icon: Plane, title: 'Airport Transfer', description: 'Complimentary pickup and drop-off service' },
  { icon: Hotel, title: 'Accommodation Assistance', description: 'Help finding nearby hotels and booking' },
  { icon: Heart, title: 'Aftercare Support', description: 'Lifetime warranty and ongoing consultations' },
];

export function WhatsIncluded() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-text-primary mb-4 text-3xl font-semibold">What's Included</h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Every treatment plan includes comprehensive support to ensure your comfort and confidence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {includedItems.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="bg-bg-secondary rounded-lg p-6 border border-gray-100 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-soft rounded-lg mb-4">
                  <IconComponent className="w-7 h-7 text-accent-primary" />
                </div>
                <h3 className="text-text-primary font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

