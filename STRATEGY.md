# 🎯 STRATEGIC ROADMAP: Frontend Architecture & Performance
**Status:** Active | **Last Updated:** 2025-01-16 | **Guardian:** CI + Bundle Regression Checks

---

## 📊 CURRENT STATE ANALYSIS

### ✅ Achievements (Mission 8.3)
- **Admin chunk:** 110KB raw / 27KB gzip (60% reduction)
- **Bundle regression guard:** CI-enforced (35KB gzip threshold)
- **NavigationContext:** Extracted (prevents App.tsx leaks)
- **briefLead:** Fully dynamic import
- **Public page leakage:** 0

### ⚠️ Critical Findings

#### 1. **App.tsx: Static + Lazy Import Conflict** 🔴
- **Problem:** Lines 7-24 have static imports (Home, AdminLeads, DoctorPortal, etc.)
- **BUT:** Lines 26-32 also have `lazy()` versions
- **Impact:** Static imports win → lazy loading **completely ineffective**
- **Risk:** All routes bundled eagerly, negating route-level splitting

#### 2. **vite.config.ts: Missing manualChunks** 🔴
- **Problem:** No `build.rollupOptions.output.manualChunks` configuration
- **Impact:** Vendor libraries not properly chunked (no react-vendor, supabase-vendor, etc.)
- **Risk:** Bundle regression guard works, but chunking strategy non-existent

#### 3. **NavigationContext: Duplicate Definition** 🟡
- **Problem:** `NavigationContext` defined in `App.tsx` (line 142) AND `src/lib/navigationContext.tsx`
- **Impact:** `Home.tsx` (line 3) and `Process.tsx` (line 10) import from `App.tsx` → **bundle leak risk**
- **Risk:** Public pages can leak into admin/doctor chunks

#### 4. **Doctor Portal: No Optimization** 🟡
- **Problem:** No doctor chunk size monitoring, no lazy loading optimization
- **Impact:** Doctor routes may bloat over time
- **Risk:** Similar to pre-optimization admin bundle

#### 5. **Radix UI: 20+ Packages Ungrouped** 🟡
- **Problem:** No vendor chunking for Radix UI family
- **Impact:** Larger initial bundle, poor cache efficiency
- **Risk:** Slower initial load

---

## 🚀 3-PHASE STRATEGIC ROADMAP

---

## **PHASE A: PERFORMANCE & UX (Admin + Doctor)**
**Timeline:** 1-2 weeks | **ROI:** High | **Risk:** Low

### A.1: Fix Static/Lazy Import Conflict in App.tsx
**WHY:**
- Current route splitting is **completely broken** (static imports override lazy)
- Admin/Doctor/Patient portals all load eagerly
- Wastes 8.3 optimizations

**WHAT:**
- Remove ALL static page imports (lines 7-24)
- Keep ONLY `lazy()` imports
- Wrap all route elements with `<Suspense>` (already partially done)

**HOW:**
- File: `src/App.tsx`
- Delete lines 7-24 (static imports)
- Verify lines 26-32 lazy imports remain
- Add missing `Suspense` wrappers if needed
- Test: Admin/Doctor routes should show loading spinner, then render

**EXPECTED GAIN:**
- Initial bundle: ~40-50% reduction
- Admin/Doctor first paint: ~30% faster
- Route transitions: Smooth lazy loading

---

### A.2: Restore manualChunks in vite.config.ts
**WHY:**
- Vendor libraries are merged into main bundle (no chunking)
- Poor cache efficiency (any code change invalidates all vendor code)
- No separation of concerns (React vs Supabase vs Radix UI)

**WHAT:**
- Add `build.rollupOptions.output.manualChunks` function
- Group vendors by family:
  - `react-vendor`: React, React-DOM, React-Router
  - `supabase-vendor`: Supabase client
  - `ui-vendor`: Radix UI family (20+ packages)
  - `forms-vendor`: react-hook-form, react-day-picker
  - `analytics-vendor`: posthog-js (already lazy, but chunked)
  - `state-vendor`: zustand
  - `admin`: Admin pages (existing)
  - `doctor`: Doctor pages (NEW)

**HOW:**
- File: `vite.config.ts`
- Add `build.rollupOptions.output.manualChunks` function
- Use pattern matching: `id.includes('/node_modules/react')` → `react-vendor`
- Match existing admin chunk rules, add doctor chunk rules
- Test: `npm run analyze` → verify chunks exist

**EXPECTED GAIN:**
- Cache hit rate: ~70% → ~90% (vendor chunks rarely change)
- Initial load: ~20-30% faster (parallel chunk loading)
- Long-term: Bundle grows slower (vendor chunks stable)

---

### A.3: Fix NavigationContext Import Leak
**WHY:**
- `Home.tsx` and `Process.tsx` import `NavigationContext` from `App.tsx`
- Creates dependency chain: Public pages → App.tsx → Admin/Doctor imports
- Negates `navigationContext.tsx` extraction

**WHAT:**
- Remove `NavigationContext` definition from `App.tsx` (line 142)
- Update `Home.tsx` line 3: `import { NavigationContext } from '@/lib/navigationContext'`
- Update `Process.tsx` line 10: `import { NavigationContext } from '@/lib/navigationContext'`
- Verify `App.tsx` imports from `@/lib/navigationContext`

**HOW:**
- Files: `src/App.tsx`, `src/pages/Home.tsx`, `src/pages/Process.tsx`
- Search/replace: `from '../App'` → `from '@/lib/navigationContext'`
- Test: Verify public pages don't pull in admin/doctor code

**EXPECTED GAIN:**
- Public bundle: ~10-15% reduction (removes admin/doctor dependency)
- Admin/Doctor bundles: Unchanged (already using correct import)
- Long-term: Prevents future leaks

---

### A.4: Doctor Portal Bundle Monitoring
**WHY:**
- Doctor routes can grow like admin did (no guardrails)
- No visibility into doctor chunk size
- Risk of future bloat

**WHAT:**
- Extend `parse-admin-chunk.mjs` → `parse-chunks.mjs`
- Add doctor chunk detection and reporting
- Add doctor chunk threshold (e.g., 40KB gzip)
- Update CI workflow to check both admin + doctor

**HOW:**
- File: `scripts/parse-chunks.mjs` (rename from parse-admin-chunk.mjs)
- Add `findDoctorChunk()` function
- Add `MAX_DOCTOR_GZIP_KB` env var (default: 40)
- Update `.github/workflows/ci.yml` to check both

**EXPECTED GAIN:**
- Doctor bundle: Controlled growth
- Visibility: Early warning if doctor chunk grows
- Consistency: Same guardrails as admin

---

## **PHASE B: ARCHITECTURAL GUARDRAILS (CI, Lint, Boundaries)**
**Timeline:** 1 week | **ROI:** Medium-High | **Risk:** Low

### B.1: ESLint Import Restrictions (Complete Implementation)
**WHY:**
- Current ESLint config exists but not enforced in CI
- No automated prevention of `@/App` imports in admin/doctor modules
- Manual review can miss violations

**WHAT:**
- Install ESLint dependencies (`eslint`, `@eslint/js`)
- Add `lint` script to `package.json`
- Add ESLint step to CI workflow (before bundle guard)
- Verify existing `eslint.config.js` rules work

**HOW:**
- Files: `package.json`, `.github/workflows/ci.yml`
- Run: `npm install --save-dev eslint @eslint/js`
- Add script: `"lint": "eslint ."`
- CI step: `npm run lint` (fail on error)

**EXPECTED GAIN:**
- Prevention: Catch import violations before merge
- Developer experience: Immediate feedback (IDE + CI)
- Code quality: Enforced boundaries

---

### B.2: Bundle Size Budgets (Multi-Chunk Monitoring)
**WHY:**
- Current guard only checks admin chunk
- No visibility into vendor chunks, public chunks, doctor chunks
- Vendor chunk growth can slow initial load

**WHAT:**
- Extend `parse-chunks.mjs` to report ALL chunks
- Add budget thresholds:
  - `react-vendor`: 150KB gzip
  - `ui-vendor`: 120KB gzip
  - `supabase-vendor`: 50KB gzip
  - `public-initial`: 200KB gzip (first public route)
  - `admin`: 35KB gzip (existing)
  - `doctor`: 40KB gzip (from A.4)

**HOW:**
- File: `scripts/parse-chunks.mjs`
- Parse all chunks from `stats.html`
- Apply budget checks per chunk
- Fail CI if any budget exceeded
- Add `BUDGET_*_KB` env vars for flexibility

**EXPECTED GAIN:**
- Full visibility: All chunk sizes tracked
- Prevention: Catch vendor bloat early
- Long-term: Predictable bundle growth

---

### B.3: Route Boundary Enforcement (TypeScript + Lint)
**WHY:**
- No compile-time prevention of cross-route imports
- Easy to accidentally import admin code in public routes
- Type system can help enforce boundaries

**WHAT:**
- Create route boundary types/utilities
- Add TypeScript path mapping restrictions (if possible)
- Document import patterns in CONTRIBUTING.md

**HOW:**
- File: `src/lib/routeBoundaries.ts` (optional helper)
- Documentation: `docs/IMPORT_RULES.md`
- Lint rule: Already in `eslint.config.js` (B.1 enforces)

**EXPECTED GAIN:**
- Developer clarity: Clear rules on what can import what
- Prevention: TypeScript + ESLint catch violations
- Onboarding: New devs understand boundaries

---

## **PHASE C: PRODUCT MATURITY (AI, Timeline, Operational)**
**Timeline:** 2-3 weeks | **ROI:** High | **Risk:** Medium

### C.1: AI Feature Modularization
**WHY:**
- AI features scattered across `src/lib/ai/` (10+ files)
- `briefLead`, `normalizeLeadNote`, `canonicalNote` all potentially heavy
- No lazy loading for AI features (except briefLead)

**WHAT:**
- Audit AI feature usage (which routes/pages use which AI features)
- Lazy load AI modules per route:
  - Admin: AI features loaded on-demand
  - Doctor: AI features loaded on-demand
  - Public: No AI features (already true)
- Create `src/lib/ai/lazy.ts` with dynamic import helpers

**HOW:**
- Files: `src/lib/ai/*`, `src/pages/AdminLeads.tsx`, `src/pages/DoctorLeadView.tsx`
- Pattern: `const { briefLead } = await import('@/lib/ai/briefLead')`
- Test: Verify AI features load only when used

**EXPECTED GAIN:**
- Admin/Doctor initial load: ~15-20% faster
- AI features: Loaded on-demand (better UX)
- Maintainability: Clear AI feature boundaries

---

### C.2: Content/Translation Route-Aware Loading
**WHY:**
- Current `i18n.tsx` is route-aware (Mission 8.3.2), but can be optimized further
- Marketing content (siteContent, copy) still loaded for some internal routes
- Large content files can slow initial load

**WHAT:**
- Verify `i18n.tsx` route-aware loading works correctly
- Audit content file sizes (siteContent.ts, copy.ts, internal.ts)
- Split content further if needed (e.g., admin-content.ts, doctor-content.ts)
- Lazy load content per route type

**HOW:**
- File: `src/lib/i18n.tsx` (verify existing implementation)
- Files: `src/content/*.ts` (audit sizes)
- Test: Verify admin/doctor routes don't load marketing content

**EXPECTED GAIN:**
- Internal routes: ~5-10% faster (no marketing content)
- Public routes: Unchanged (already optimized)
- Maintainability: Clear content boundaries

---

### C.3: Operational Monitoring (Performance + Errors)
**WHY:**
- No visibility into real-world performance (Core Web Vitals)
- No error tracking for bundle/route loading failures
- PostHog analytics exists but not fully utilized for performance

**WHAT:**
- Add route-level performance tracking (time to first byte, route load time)
- Add bundle load error tracking (failed chunk loads)
- Add Core Web Vitals reporting (LCP, FID, CLS)
- Dashboard: Track bundle sizes over time (PostHog or custom)

**HOW:**
- Files: `src/lib/analytics.ts`, `src/App.tsx`, `src/lib/posthog.ts`
- Pattern: `trackEvent({ type: 'route_load', route, duration })`
- Error boundary: Track lazy load failures
- CI: Store bundle sizes in artifact (track over time)

**EXPECTED GAIN:**
- Visibility: Real-world performance metrics
- Debugging: Identify slow routes/chunks
- Data-driven: Make optimization decisions based on metrics

---

## 📋 IMPLEMENTATION PRIORITY

### **Immediate (This Week)**
1. **A.1:** Fix static/lazy import conflict (CRITICAL - breaks all route splitting)
2. **A.2:** Restore manualChunks (CRITICAL - no vendor chunking)
3. **A.3:** Fix NavigationContext leak (HIGH - prevents future leaks)

### **Short-term (Next 2 Weeks)**
4. **A.4:** Doctor bundle monitoring (MEDIUM - preventive)
5. **B.1:** ESLint CI enforcement (MEDIUM - automation)
6. **B.2:** Multi-chunk budget monitoring (MEDIUM - visibility)

### **Medium-term (Next Month)**
7. **C.1:** AI feature modularization (HIGH - performance)
8. **C.2:** Content route-aware audit (LOW - optimization)
9. **C.3:** Operational monitoring (MEDIUM - data-driven)

---

## 🎯 SUCCESS METRICS

### Performance
- **Initial bundle (public):** < 250KB gzip (from current ~300KB+)
- **Admin chunk:** < 35KB gzip (maintain)
- **Doctor chunk:** < 40KB gzip (new target)
- **Route transition:** < 200ms (lazy load + render)

### Code Quality
- **ESLint violations:** 0 (CI enforced)
- **Import violations:** 0 (automated detection)
- **Bundle regression:** 0 (CI enforced)

### Operational
- **Performance tracking:** 100% route coverage
- **Error tracking:** All lazy load failures captured
- **Bundle size trend:** Decreasing or stable

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Breaking Changes from A.1 (Static/Lazy Fix)
- **Mitigation:** Thorough testing of all routes, staged rollout
- **Rollback:** Revert App.tsx changes if issues arise

### Risk 2: manualChunks Configuration Complexity
- **Mitigation:** Start with simple patterns, iterate based on analyze output
- **Rollback:** Remove manualChunks if bundle breaks

### Risk 3: ESLint False Positives
- **Mitigation:** Test rules locally, refine patterns before CI enforcement
- **Rollback:** Disable ESLint step temporarily

---

## 📚 DOCUMENTATION NEEDED

- [ ] `docs/IMPORT_RULES.md` - Clear rules on cross-route imports
- [ ] `docs/BUNDLE_OPTIMIZATION.md` - Explanation of chunking strategy
- [ ] `docs/ROUTE_LAZY_LOADING.md` - How route splitting works
- [ ] Update `CONTRIBUTING.md` - Add bundle size guidelines

---

**END OF STRATEGY DOCUMENT**


