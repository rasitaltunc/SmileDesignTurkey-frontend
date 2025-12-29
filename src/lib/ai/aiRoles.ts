// AI Role Policy Skeleton - Future role-based access control

export type AIRole = "admin" | "employee" | "doctor" | "patient";

export interface RoleScope {
  canSeePII: boolean;
  canSeeInternalNotes: boolean;
  canApplyActions: boolean;
}

/**
 * Get role scope for AI operations
 */
export function getRoleScope(role: AIRole): RoleScope {
  switch (role) {
    case "admin":
      return {
        canSeePII: true,
        canSeeInternalNotes: true,
        canApplyActions: true,
      };
    case "employee":
      return {
        canSeePII: true,
        canSeeInternalNotes: true,
        canApplyActions: true,
      };
    case "doctor":
      return {
        canSeePII: true,
        canSeeInternalNotes: false, // Doctors see patient data but not internal notes
        canApplyActions: false, // Read-only for now
      };
    case "patient":
      return {
        canSeePII: false, // Patients don't see their own PII in AI context
        canSeeInternalNotes: false,
        canApplyActions: false,
      };
    default:
      // Fallback: most restrictive
      return {
        canSeePII: false,
        canSeeInternalNotes: false,
        canApplyActions: false,
      };
  }
}

