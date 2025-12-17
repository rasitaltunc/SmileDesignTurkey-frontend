# Admin Leads Page Guide

This guide explains how to access and use the Admin Leads page to view and manage captured leads.

## Accessing the Admin Leads Page

### URL Format
```
/admin/leads?token=YOUR_TOKEN
```

### Setting Up Access

1. **Set Admin Token in Environment Variables**

   **Local Development (.env.local):**
   ```bash
   VITE_ADMIN_TOKEN=your_secure_token_here
   ```

   **Production (Netlify/Vercel):**
   - Go to your hosting platform's environment variables settings
   - Add: `VITE_ADMIN_TOKEN` = `your_secure_token_here`
   - Redeploy your site

2. **Access the Page**
   - Navigate to: `https://your-site.com/admin/leads?token=your_secure_token_here`
   - Replace `your_secure_token_here` with the token you set in environment variables

### Security Notes

- **Development Mode:** If `VITE_ADMIN_TOKEN` is not set, the page is accessible without a token (for local testing only)
- **Production Mode:** If `VITE_ADMIN_TOKEN` is not set, the page will show "Unauthorized" and block access
- **Always set a strong token in production** to protect lead data

## Features

### View Leads
- The page displays all captured leads in a table
- Leads are sorted by creation date (newest first)
- Shows: Created date, Source (contact/onboarding), Name, Email, Phone, Treatment, Timeline, Language, Page URL

### Export CSV
1. Click the **"Export CSV"** button
2. A CSV file will download with all leads
3. File name format: `leads_YYYY-MM-DD.csv`
4. The CSV includes all lead fields and properly escapes commas, quotes, and newlines

### Refresh Leads
1. Click the **"Refresh"** button to reload leads from localStorage
2. Useful if you have multiple tabs open or want to see new leads

### Clear All Leads
1. Click the **"Clear Leads"** button
2. Confirm the action in the popup
3. **Warning:** This permanently deletes all leads from localStorage
4. This action cannot be undone

## Lead Sources

Leads are captured from two sources:

1. **Contact Form** (`source: "contact"`)
   - When users submit the contact form at `/contact`
   - Captures: name, email, phone, message, language, page URL

2. **Onboarding** (`source: "onboarding"`)
   - When users complete the onboarding flow
   - Captures: name, email, phone, treatment, goal, timeline, language, page URL

## Troubleshooting

### "Unauthorized" Message
- Check that `VITE_ADMIN_TOKEN` is set in your environment variables
- Verify the token in the URL matches the token in environment variables
- In production, ensure the token is set (dev mode allows access without token)

### No Leads Showing
- Leads are stored in browser localStorage
- Each browser/device has separate storage
- Test by submitting the contact form or completing onboarding
- Use the "Refresh" button to reload

### CSV Export Not Working
- Check browser download settings
- Ensure pop-ups are not blocked
- Try a different browser

### Leads Not Appearing After Form Submit
- Check browser console for errors
- Verify localStorage is not disabled
- Check that `saveLead()` is being called in Contact/Onboarding pages

## Privacy & Data Storage

- Leads are stored in browser localStorage (client-side only)
- No data is sent to external servers unless `VITE_LEAD_WEBHOOK_URL` is configured
- Leads persist until:
  - User clears browser data
  - Admin clears leads via the admin page
  - Browser storage limit is reached (10,000 leads max)

## Webhook Integration (Optional)

If `VITE_LEAD_WEBHOOK_URL` is set, leads are automatically sent to your webhook endpoint:

- **Format:** POST request with JSON body containing the lead data
- **Fire-and-forget:** Webhook failures don't block the UI
- **Use case:** Real-time lead notifications, CRM integration, email alerts

Example webhook payload:
```json
{
  "id": "1234567890-abc123",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "source": "contact",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "message": "I'm interested in dental implants",
  "lang": "en",
  "pageUrl": "https://your-site.com/contact"
}
```

