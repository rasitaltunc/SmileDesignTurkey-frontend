/**
 * Doctor Module Index - Unified exports
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 */

// Doctor Blind Service
export {
    // Types
    type BlindConversation,
    type BlindMessage,
    type DoctorAccessLog,

    // Content masking
    maskPhoneNumbers,
    maskEmails,
    maskSensitiveContent,
    filterMessageForDoctor,
    filterConversationForDoctor,

    // API functions
    getDoctorBlindInbox,
    getDoctorBlindMessages,
    sendDoctorBlindReply,
    markMessagesAsRead,

    // Audit
    logDoctorAccess,
    logExportAttempt,

    // Security checks
    checkDoctorAccess,
    canExport,
    canForward,
    canCopyContact,
} from './doctorBlindService';

// Default export
import doctorBlindService from './doctorBlindService';
export default doctorBlindService;
