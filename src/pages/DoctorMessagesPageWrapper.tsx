/**
 * DoctorMessagesPageWrapper - Page wrapper for doctor blind mode messages
 * Routes: /doctor/messages
 */

import { useAuthStore } from '@/store/authStore';
import DoctorMessagesPage from '@/components/doctor/DoctorMessagesPage';

export default function DoctorMessagesPageWrapper() {
    const { user } = useAuthStore();
    const doctorId = user?.id || 'demo-doctor';

    return <DoctorMessagesPage doctorId={doctorId} />;
}
