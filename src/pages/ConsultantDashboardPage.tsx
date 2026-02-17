/**
 * ConsultantDashboardPage - Page wrapper for consultant dashboard
 * Routes: /consultant
 */

import { useAuthStore } from '@/store/authStore';
import ConsultantDashboard from '@/components/consultant/ConsultantDashboard';

export default function ConsultantDashboardPage() {
    const { user } = useAuthStore();
    const consultantId = user?.id || 'demo-consultant';

    return <ConsultantDashboard consultantId={consultantId} />;
}
