import { User, Award, Building } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export function Credentials() {
  const { copy } = useLanguage();

  return (
    <section className="py-20 bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-text-primary mb-4 text-3xl font-semibold">Doctor & Clinic Credentials</h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Licensed specialists and accredited facilities you can trust
          </p>
        </div>

        {/* Doctors */}
        <div className="mb-16">
          <h3 className="text-text-primary mb-8 text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-accent-primary" />
            Our Specialists
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {copy.doctors.map((doctor, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-md flex gap-4">
                <div className="w-20 h-20 bg-accent-soft rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-10 h-10 text-accent-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-text-primary mb-1">{doctor.name}</h4>
                  <p className="text-sm text-accent-primary mb-2">{doctor.title}</p>
                  <p className="text-sm text-text-secondary mb-2">{doctor.specialization}</p>
                  <p className="text-xs text-text-tertiary">{doctor.experience} {copy.doctorsSection?.experienceLabel || 'years of experience'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinics */}
        <div>
          <h3 className="text-text-primary mb-8 text-xl font-semibold flex items-center gap-2">
            <Building className="w-5 h-5 text-accent-primary" />
            Partner Clinics
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {copy.clinics.map((clinic, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-md">
                <h4 className="text-lg font-semibold text-text-primary mb-2">{clinic.name}</h4>
                <p className="text-text-secondary text-sm mb-3">{clinic.location}</p>
                <p className="text-text-secondary text-sm mb-4">{clinic.description}</p>
                <div className="flex flex-wrap gap-2">
                  {clinic.accreditation.map((acc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent-soft text-accent-primary px-3 py-1 rounded-full">
                      <Award className="w-3 h-3" />
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

