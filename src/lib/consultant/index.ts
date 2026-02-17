/**
 * Consultant Service Index - Unified exports
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 */

export {
    // Types
    type ConsultantConversation,
    type ConsultantStats,
    type PatientPersona,
    type Badge,
    type ResponseTemplate,

    // Priority & scoring
    calculatePriorityScore,
    calculateSLA,
    getPatientPersona,

    // Templates
    getSuggestedTemplates,
    getAllTemplates,

    // Data fetching
    getConsultantInbox,
    getConsultantStats,

    // Actions
    assignToDoctor,

    // Constants
    PATIENT_PERSONAS,
    BADGES,
} from './consultantService';

// Default export
import consultantService from './consultantService';
export default consultantService;
