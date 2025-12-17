# GuideHealth MVP - Setup & Run Instructions (Mac)

This is a React + Vite application for GuideHealth's lead capture and funnel tracking MVP.

## Prerequisites

- **Node.js**: Version 18.x or higher (recommended: 20.x LTS)
- **npm**: Comes with Node.js (version 9.x or higher)

### Check Your Node Version

```bash
node --version
```

If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/) or use Homebrew:

```bash
brew install node
```

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd "/Users/ALTUNC/Desktop/Raşit/Harry Potter Figma Tutsağı Bölüm2"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   This will install all required packages including React, Vite, and UI components.

## Running the Development Server

```bash
npm run dev
```

The app will start on **http://localhost:3000** and automatically open in your browser.

## Building for Production

```bash
npm run build
```

The production build will be created in the `build/` directory.

## Configuration

### WhatsApp Phone Number

To change the WhatsApp phone number used in CTAs, edit:

**File:** `src/config.ts`

```typescript
export const BRAND = {
  name: "GuideHealth",
  whatsappPhoneE164: "+905000000000",  // ← Change this
  defaultLang: "en",
} as const;
```

The phone number should be in E.164 format (e.g., `+905000000000` for Turkey, `+1234567890` for US).

## Available Routes

- `/` - Home page with hero and treatment overview
- `/onboarding` - 5-step onboarding flow (saves to localStorage)
- `/plan-dashboard` - Dashboard showing saved onboarding data
- `/contact` - Contact form (saves to localStorage + mailto fallback)

## Features

### Lead Capture
- **Onboarding Flow**: Collects goal, timeline, language, and contact info
- **Contact Form**: Name, email, phone, message
- **WhatsApp CTAs**: All primary buttons open WhatsApp with prefilled messages

### Data Storage (Local Only)
- **Onboarding Data**: Stored in `localStorage` key `guidehealth_onboarding_v1`
- **Contact Leads**: Stored in `localStorage` key `leads_v1`
- **Analytics Events**: Stored in `localStorage` key `events_v1`

### Analytics Tracking
Events are logged to console and saved to localStorage:
- `start_onboarding`
- `onboarding_step_complete` (with step number)
- `whatsapp_click` (with location)
- `contact_submit`
- `view_plan_dashboard`

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual URL.

### Module Not Found Errors
If you see module errors, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
The project uses TypeScript. If you see type errors, ensure all dependencies are installed:
```bash
npm install
```

## Development Notes

- **No Backend**: All data is stored locally in the browser's localStorage
- **No Database**: This is an MVP for lead capture only
- **Privacy**: Data stays on the user's device (as noted in the UI)
- **WhatsApp Integration**: Uses `wa.me` links with prefilled messages

## Next Steps

When ready to add a backend:
1. Replace localStorage with API calls
2. Add database for leads and onboarding data
3. Integrate with email service for contact form
4. Add proper analytics service (e.g., Google Analytics, Mixpanel)

---

**Questions?** Check the code comments or review the implementation in:
- `src/config.ts` - Brand configuration
- `src/lib/whatsapp.ts` - WhatsApp link builder
- `src/lib/analytics.ts` - Event tracking
- `src/pages/Onboarding.tsx` - Onboarding flow
- `src/pages/Contact.tsx` - Contact form

