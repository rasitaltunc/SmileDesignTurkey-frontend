# Evidence Registry — Asset Management

This directory contains clinic photos, videos, certificates, and other evidence assets referenced in `src/content/evidence.json`.

## Quick Start

1. **Drop files into this directory:**
   ```
   public/evidence/
     ├── clinic-tour-video.mp4
     ├── jci-certificate.pdf
     ├── before-after-case1.jpg
     └── doctor-profile.jpg
   ```

2. **Update `src/content/evidence.json`:**
   - Add or update items in the appropriate section
   - Set `url` to `/evidence/your-filename.ext`
   - Fill in `title`, `description`, and optional `tags`

3. **Validate:**
   ```bash
   npm run evidence:check
   ```
   This runs automatically before `npm run build` and verifies all referenced files exist.

4. **Test locally:**
   ```bash
   npm run dev
   ```
   Check that evidence components render correctly.

## File Specifications

### Images
- **Format:** WebP preferred, JPG/PNG acceptable
- **Width:** 1600px recommended (will be responsive)
- **Max size:** 500KB per image
- **Naming:** Use descriptive, kebab-case names (e.g., `clinic-reception-area.jpg`)

### Videos
- **Format:** MP4 (H.264 codec)
- **Max size:** 20MB per video
- **Duration:** Keep clinic tours under 2 minutes
- **Naming:** Use descriptive names (e.g., `virtual-clinic-tour.mp4`)

### PDFs
- **Max size:** 5MB per PDF
- **Content:** Certificates, licenses, documentation
- **Naming:** Use clear names (e.g., `jci-accreditation-2024.pdf`)

## Placeholder Mode

If you don't have real assets yet:
- Use placeholder URLs in `evidence.json`: `/evidence/placeholder.jpg`, `/evidence/placeholder.pdf`
- Components will show "Available during consultation" in production
- In development, you'll see "(placeholder)" labels

## Evidence Sections

The registry supports these sections (defined in `evidence.json`):

- **clinic-tour**: Virtual tours, facility photos
- **certificates**: Accreditations, licenses, certifications
- **before-after**: Patient case studies (with consent)
- **team-doctor**: Doctor profiles, team photos, credentials

## Required Files per Page

Configured in `evidence.json` → `required`:
- **home**: clinic-tour, certificates
- **pricing**: certificates
- **process**: clinic-tour, certificates, before-after

## Validation

The `evidence:check` script (runs automatically before build) will:
- ✅ Verify all `/evidence/*` URLs point to existing files
- ❌ Fail if any referenced file is missing
- ⚠️ Skip external links and placeholder URLs

## Example evidence.json Entry

```json
{
  "id": "cert-jci",
  "type": "pdf",
  "title": "JCI Accreditation",
  "description": "Joint Commission International accreditation certificate",
  "url": "/evidence/jci-accreditation-2024.pdf",
  "tags": ["accreditation", "certification"],
  "lang": "en"
}
```

## Notes

- All evidence must comply with patient privacy regulations
- Before/after photos require explicit patient consent
- Keep file sizes optimized for web performance
- Update `evidence.json` version when making breaking changes

