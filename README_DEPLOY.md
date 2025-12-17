# GuideHealth - Production Deployment Guide

This guide covers deploying the GuideHealth Vite React app to production hosting platforms.

## Prerequisites

- Node.js 18+ installed
- Production build tested locally (`npm run build` and `npm run preview`)
- GitHub repository (optional, for automatic deployments)

## Pre-Deployment Checklist

1. **Update Site URL in Meta Tags**
   - Edit `index.html` and replace `https://your-site-url.netlify.app/` with your actual production URL
   - Update Open Graph and Twitter card URLs
   - Update `public/sitemap.xml` with your production URL
   - Update `public/robots.txt` with your production URL

2. **Add Open Graph Image**
   - Create or add `public/og.jpg` (recommended: 1200x630px)
   - This image appears when sharing links on social media
   - If missing, social platforms will use a default image

3. **Verify WhatsApp Number**
   - Check `src/config.ts` - ensure WhatsApp number is correct for production
   - Current: `+905079573062`

## Deployment Options

### Option 1: Netlify (Recommended for Simplicity)

#### Method A: Drag and Drop
1. Build the project locally:
   ```bash
   npm run build
   ```
2. Go to [Netlify](https://app.netlify.com/)
3. Drag and drop the `dist` folder to the Netlify dashboard
4. Your site will be live immediately with a `.netlify.app` URL

#### Method B: GitHub Integration
1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"
7. Future pushes to main branch will auto-deploy

#### Custom Domain on Netlify
1. In Netlify dashboard, go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `guidehealth.com`)
4. Follow DNS configuration instructions
5. Netlify will handle SSL certificates automatically

### Option 2: Vercel

#### Method A: Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. In project directory, run:
   ```bash
   vercel
   ```
3. Follow prompts to link project
4. Deploy:
   ```bash
   vercel --prod
   ```

#### Method B: GitHub Integration
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite settings
6. Click "Deploy"
7. Future pushes will auto-deploy

#### Custom Domain on Vercel
1. In Vercel dashboard, go to Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Vercel handles SSL automatically

## Post-Deployment Steps

1. **Update Meta Tags with Production URL**
   - After deployment, update `index.html` with your actual production URL
   - Update `public/sitemap.xml` with production URL
   - Update `public/robots.txt` with production URL
   - Commit and redeploy

2. **Test All Routes**
   - Visit: `/`, `/onboarding`, `/plan-dashboard`, `/contact`
   - Verify all routes load correctly (SPA routing works)

3. **Test WhatsApp Links**
   - Click all WhatsApp CTAs
   - Verify they open with correct phone number

4. **Verify SEO**
   - Test with [Google Rich Results Test](https://search.google.com/test/rich-results)
   - Check Open Graph preview with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Verify sitemap is accessible: `https://your-site.com/sitemap.xml`

## Supabase Setup (Production-Safe Lead Storage)

### 1. Create Supabase Table

Run the SQL in `supabase/leads.sql` in your Supabase Dashboard > SQL Editor.

This will:
- Create the `leads` table
- Enable Row Level Security (RLS)
- Allow INSERT from public (anon key)
- **Block SELECT from public** (only service role can read)

### 2. Deploy Secure Admin Endpoint

Deploy the Supabase Edge Function to read leads securely:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set environment variables in Supabase Dashboard:
# Go to: Edge Functions > admin-leads > Settings
# Add secrets:
#   - ADMIN_TOKEN: Your admin token (same as VITE_ADMIN_TOKEN)
#   - SUPABASE_SERVICE_ROLE_KEY: From Dashboard > Settings > API
#   - SUPABASE_URL: Your project URL (optional, auto-detected)

# Deploy
supabase functions deploy admin-leads
```

The function will be available at:
```
https://your-project-ref.supabase.co/functions/v1/admin-leads?token=your-admin-token
```

### 3. Update Environment Variables

Add to your `.env.local` (and production env vars):

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_TOKEN=your-admin-token
```

**Important:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code. It's only set in the Edge Function environment.

## Environment Variables

### Required for Production

**PostHog Analytics:**
- `VITE_POSTHOG_KEY` - Your PostHog project API key (starts with `phc_`)
- `VITE_POSTHOG_HOST` - PostHog host (default: `https://us.i.posthog.com`)

**Admin Access:**
- `VITE_ADMIN_TOKEN` - Token to access `/admin/leads` page (optional but recommended)

### Optional

**Lead Webhook (Production):**
- `VITE_LEAD_WEBHOOK_URL` - Webhook URL to receive leads in real-time (optional)

### Setting Environment Variables

**Netlify:**
1. Go to Site settings → Environment variables
2. Add each variable with its value
3. Redeploy the site

**Vercel:**
1. Go to Project settings → Environment Variables
2. Add each variable for Production (and Preview/Development if needed)
3. Redeploy the site

**Important:** After changing `.env.local` locally, restart the dev server:
```bash
npm run dev
```

### Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your values:
   ```
   VITE_POSTHOG_KEY=phc_your_key_here
   VITE_POSTHOG_HOST=https://us.i.posthog.com
   VITE_ADMIN_TOKEN=your_secure_token_here
   VITE_LEAD_WEBHOOK_URL=https://your-webhook-url.com/leads
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Routes Return 404
- Ensure `netlify.toml` (Netlify) or `vercel.json` (Vercel) is in root directory
- Both configs include SPA redirect rules

### Build Fails
- Run `npm install` to ensure dependencies are up to date
- Check Node version matches (18+)
- Review build errors in deployment logs

### Meta Tags Not Showing
- Clear browser cache
- Use social media debuggers to refresh cache
- Verify URLs in meta tags are absolute (not relative)

## Support

For deployment issues:
- Netlify: [docs.netlify.com](https://docs.netlify.com)
- Vercel: [vercel.com/docs](https://vercel.com/docs)

