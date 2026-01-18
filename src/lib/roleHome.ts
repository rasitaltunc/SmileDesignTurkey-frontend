// src/lib/roleHome.ts
// Single source of truth for role home paths

export function getHomePath(role: string | null | undefined): string {
  if (!role) return "/";
  
  const normalizedRole = String(role).trim().toLowerCase();
  
  switch (normalizedRole) {
    case "admin":
      return "/admin/leads";
    case "employee":
      return "/employee/leads";
    case "doctor":
      return "/doctor";
    case "patient":
      return "/portal";
    default:
      return "/";
  }
}

export function getHomeLabel(role: string | null | undefined): string {
  if (!role) return "Home";
  
  const normalizedRole = String(role).trim().toLowerCase();
  
  switch (normalizedRole) {
    case "admin":
      return "Leads";
    case "employee":
      return "Leads";
    case "doctor":
      return "Inbox";
    case "patient":
      return "My Portal";
    default:
      return "Home";
  }
}

