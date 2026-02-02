import DoctorSettingsPanel from '@/components/doctor/settings/DoctorSettingsPanel';

export default function DoctorSettings() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile, signature, templates, and workflow preferences.
        </p>
      </div>
      <DoctorSettingsPanel />
    </div>
  );
}
