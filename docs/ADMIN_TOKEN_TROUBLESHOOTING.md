# Admin Token Troubleshooting Guide

## Problem: "Invalid credentials" (401) Errors

### Root Cause
Frontend uses `VITE_ADMIN_TOKEN`, backend expects `ADMIN_TOKEN`. Both must be set in Vercel.

---

## ✅ Solution: Set Both Environment Variables in Vercel

### Step 1: Get Your Admin Token Value
Your admin token is a secret string (e.g., `admin123` or a longer secure token).

### Step 2: Add to Vercel Environment Variables

**Vercel Dashboard → Project → Settings → Environment Variables**

Add these **2 variables**:

1. **Name:** `ADMIN_TOKEN`
   - **Value:** `your-admin-token-value`
   - **Environment:** Production, Preview, Development (all)

2. **Name:** `VITE_ADMIN_TOKEN`
   - **Value:** `your-admin-token-value` (same value as above)
   - **Environment:** Production, Preview, Development (all)

**Important:** Both must have the **exact same value**.

### Step 3: Redeploy
After adding variables, Vercel will auto-redeploy. Or manually trigger:
- Vercel Dashboard → Deployments → Redeploy

---

## 🔍 Verification

### Check if tokens are loaded (server-side)
```bash
curl -X GET "https://smile-design-turkey-frontend.vercel.app/api/env-check"
```

**Expected response:**
```json
{
  "hasSecret": true,
  "secretLength": 93,
  "hasBaseUrl": true,
  "baseUrl": "https://cal.com/...",
  "hasAdminToken": true,
  "adminTokenLength": 8
}
```

If `hasAdminToken: false` or `adminTokenLength: 0`, the token is not set in Vercel.

---

## 🧪 Testing with curl

### ❌ WRONG (what you did)
```bash
curl -X POST "https://smile-design-turkey-frontend.vercel.app/api/leads-mark-contacted" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $admin123" \
  -d '{"lead_id":"test"}'
```

**Problem:** `$admin123` is treated as a shell variable. If it doesn't exist, it's empty → 401.

### ✅ CORRECT - Option A (using environment variable)
```bash
# First, export the token in your terminal
export ADMIN_TOKEN='your-actual-token-value-here'

# Then use it in curl
curl -X POST "https://smile-design-turkey-frontend.vercel.app/api/leads-mark-contacted" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"lead_id":"cal_1PVK6tUCrtTQGQXtrzgZzY_1766845372912"}'
```

**Note:** Backslash `\` must be at the **end of the line**, not before a space.

### ✅ CORRECT - Option B (direct value)
```bash
curl -X POST "https://smile-design-turkey-frontend.vercel.app/api/leads-mark-contacted" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: admin123" \
  -d '{"lead_id":"cal_1PVK6tUCrtTQGQXtrzgZzY_1766845372912"}'
```

**Replace `admin123` with your actual token value.**

---

## 🐛 Frontend Debugging

### Check if frontend token is loaded
Open browser console on `/admin/leads` page:

```javascript
// Check if token exists
console.log('VITE_ADMIN_TOKEN:', import.meta.env.VITE_ADMIN_TOKEN);

// Check length (without exposing value)
console.log('Token length:', import.meta.env.VITE_ADMIN_TOKEN?.length || 0);
```

**Expected:**
- `VITE_ADMIN_TOKEN: "your-token-value"` (or the actual value)
- `Token length: 8` (or your token's length)

**If empty:**
- Token not set in Vercel
- Or not redeployed after adding variable

---

## 🔧 Common Issues

### Issue 1: Token set but still 401
**Cause:** Token values don't match (typo, extra spaces, different values)

**Fix:**
1. Copy token value from Vercel `ADMIN_TOKEN`
2. Paste exact same value into `VITE_ADMIN_TOKEN`
3. Redeploy

### Issue 2: Frontend works, curl doesn't
**Cause:** You're using wrong token value in curl

**Fix:**
1. Check Vercel `ADMIN_TOKEN` value
2. Use exact same value in curl header

### Issue 3: Token works in dev, not in production
**Cause:** Environment variable only set for Development, not Production

**Fix:**
1. Vercel → Settings → Environment Variables
2. Edit `ADMIN_TOKEN` and `VITE_ADMIN_TOKEN`
3. Check "Production" checkbox
4. Save and redeploy

---

## 📋 Quick Checklist

- [ ] `ADMIN_TOKEN` set in Vercel (all environments)
- [ ] `VITE_ADMIN_TOKEN` set in Vercel (all environments)
- [ ] Both have **exact same value**
- [ ] Redeployed after adding variables
- [ ] `/api/env-check` shows `hasAdminToken: true`
- [ ] Browser console shows `VITE_ADMIN_TOKEN` is not empty
- [ ] curl uses correct token value (not `$admin123`)

---

## 🎯 Test Commands

### 1. Check server-side token
```bash
curl "https://smile-design-turkey-frontend.vercel.app/api/env-check"
```

### 2. Test API with correct token
```bash
# Replace YOUR_TOKEN with actual value from Vercel
curl -X POST "https://smile-design-turkey-frontend.vercel.app/api/leads-mark-contacted" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{"lead_id":"test-lead-id"}'
```

**Expected:** `{"ok":true,"leadId":"...","last_contacted_at":"..."}`

---

**Status:** ✅ Ready to fix  
**Next Step:** Add both environment variables to Vercel and redeploy

