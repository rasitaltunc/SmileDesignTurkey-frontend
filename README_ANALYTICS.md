# PostHog Analytics Setup

This app uses PostHog for product analytics to track user behavior and conversion funnels.

## What We Track

We track the following events to understand user journeys:

- **start_onboarding** - When user clicks "Get Started" from home page
  - Properties: `entry` (where they came from), `lang` (language preference)

- **onboarding_step_view** - When user views each onboarding step
  - Properties: `step` (1-5), `lang` (language preference)

- **onboarding_step_complete** - When user completes a step
  - Properties: `step` (1-5), `goal` (user's goal, if provided), `timeline` (if provided), `lang`

- **view_plan_dashboard** - When user views their plan dashboard
  - Properties: `goal`, `timeline`, `lang` (from saved onboarding data)

- **whatsapp_click** - When user clicks any WhatsApp CTA
  - Properties: `where` (home | onboarding | plan_dashboard | contact | navbar | footer | etc.), `goal`, `timeline`, `lang`

- **contact_submit** - When user submits contact form
  - Properties: `where` (contact_page), `hasEmail` (boolean), `hasPhone` (boolean), `lang`

## Privacy

- **No PII sent**: We never send raw email addresses or phone numbers in events
- **Only metadata**: We track boolean flags (hasEmail, hasPhone) and language preferences
- **User goals**: Goal text is sent but sanitized (no personal identifiers)

## How to Disable Analytics

PostHog only initializes if `VITE_POSTHOG_KEY` is set. To disable:

1. **Local development**: Remove or comment out `VITE_POSTHOG_KEY` in `.env`
2. **Production**: Remove the environment variable from your hosting platform

The app will continue to work normally without analytics.

## Setup Instructions

### 1. Get Your PostHog API Key

1. Sign up at [PostHog](https://posthog.com) (free tier available)
2. Create a new project
3. Go to **Project Settings** → **Project API Key**
4. Copy your API key (starts with `phc_`)

### 2. Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your PostHog key:
   ```
   VITE_POSTHOG_KEY=phc_your_actual_key_here
   VITE_POSTHOG_HOST=https://app.posthog.com
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### 3. Production Deployment

#### Netlify

1. Go to your site dashboard → **Site settings** → **Environment variables**
2. Add:
   - Key: `VITE_POSTHOG_KEY`
   - Value: `phc_your_actual_key_here`
3. Add (optional, if using custom PostHog host):
   - Key: `VITE_POSTHOG_HOST`
   - Value: `https://app.posthog.com`
4. Redeploy your site

#### Vercel

1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - Key: `VITE_POSTHOG_KEY`
   - Value: `phc_your_actual_key_here`
   - Environment: Production (and Preview/Development if desired)
3. Add (optional):
   - Key: `VITE_POSTHOG_HOST`
   - Value: `https://app.posthog.com`
4. Redeploy your site

## Verifying Events

### PostHog Live Events

1. Log into [PostHog](https://app.posthog.com)
2. Go to **Activity** → **Live Events**
3. Interact with your app (click buttons, navigate pages)
4. Events should appear in real-time

### Testing Checklist

- [ ] Click "Get Started" → See `start_onboarding` event
- [ ] Navigate through onboarding → See `onboarding_step_view` and `onboarding_step_complete` events
- [ ] Click WhatsApp button → See `whatsapp_click` event
- [ ] Submit contact form → See `contact_submit` event
- [ ] View plan dashboard → See `view_plan_dashboard` event

## Troubleshooting

### Events Not Appearing

1. **Check environment variable**: Ensure `VITE_POSTHOG_KEY` is set correctly
2. **Check browser console**: Look for PostHog initialization messages
3. **Check PostHog project**: Verify you're looking at the correct project
4. **Ad blockers**: Some ad blockers may block PostHog. Test in incognito mode

### Development vs Production

- Events are sent in both development and production
- Use PostHog's environment filtering to separate dev/prod data
- Or use separate PostHog projects for dev/prod

## Additional Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Integration](https://posthog.com/docs/integrate/client/react)
- [PostHog Event Tracking Best Practices](https://posthog.com/docs/getting-started/send-events)

