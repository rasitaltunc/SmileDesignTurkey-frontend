import { z } from 'zod';

// Regex for International Phone Numbers (flexible but strict on structure)
// Allows + or 00 prefix, followed by country code and actual number
const phoneRegex = /^(\+|00)[1-9][0-9 \-\(\)\.]{7,32}$/;

// Regex for Safe Names (no scripts, but allows international chars)
const nameRegex = /^[a-zA-Z\u00C0-\u00FF\s\-\']+$/;

export const patientSchema = z.object({
    firstName: z.string()
        .min(2, "Name seems a bit short, is it a typo?")
        .max(50, "Name is quite long, maybe abbreviate?")
        .regex(nameRegex, "Let's use standard letters for the name."),
    lastName: z.string()
        .min(2, "Surname seems short, check for typos?")
        .max(50, "Surname is long, is this correct?")
        .regex(nameRegex, "Let's stick to letters for the surname."),
    email: z.string()
        .email("Let's check the email format?"),
    phone: z.string()
        .regex(phoneRegex, "Let's use international format (e.g., +44...) for better connection."),
    country: z.string()
        .min(2, "Which country code?"),
    notes: z.string()
        .max(1000, "Notes are getting long, maybe summarize?")
        .optional(),
});

export const treatmentPlanSchema = z.object({
    totalCost: z.number()
        .min(100, "Treatment value seems too low")
        .max(50000, "Treatment value exceeds limit (check for typos)"),
    currency: z.enum(["GBP", "EUR", "USD", "TRY"]),
    treatments: z.array(z.string()).min(1, "Select at least one treatment"),
});

export type PatientFormData = z.infer<typeof patientSchema>;
export type TreatmentPlanData = z.infer<typeof treatmentPlanSchema>;
