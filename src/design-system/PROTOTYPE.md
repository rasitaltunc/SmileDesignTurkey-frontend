# GuideHealth Design System - Prototype Documentation

## 🎯 Prototype Flows

### Primary Journey: Home → Onboarding → Plan Dashboard

#### Flow 1: Initial Consultation
**Starting Point:** Home Page (`/`)
**End Point:** Plan Dashboard (`/plan-dashboard`)

**Steps:**

1. **Home Page** (`/pages/Home.tsx`)
   - User lands on premium split-hero layout
   - Left side: GuidedPanel with headline, subheadline, CTAs
   - Right side: TrustStage with hero image, trust badges, reviews
   - **Primary CTA:** "Get Started" button
   - **Secondary CTA:** "Show Price Range" button (links to `/pricing`)
   - **Interaction:** Click "Get Started" → Navigate to `/onboarding`

2. **Onboarding Step 1** (`/pages/Onboarding.tsx` - currentStep: 1)
   - **Component:** Stepper (1 of 5)
   - **Question:** "What brings you to GuideHealth?"
   - **Interaction:** Select treatment from 6 ChoiceCard options
   - **Validation:** Must select one treatment to proceed
   - **CTA:** "Continue" button enabled when selection made
   - **Transition:** Click "Continue" → Onboarding Step 2

3. **Onboarding Step 2** (`/pages/Onboarding.tsx` - currentStep: 2)
   - **Component:** Stepper (2 of 5)
   - **Question:** "Tell us about your goals"
   - **Interaction:** Free-form textarea (6 rows)
   - **Helper:** Blue info box about optional photo upload
   - **Validation:** Must enter text to proceed
   - **CTA:** "Continue" button
   - **Transition:** Click "Continue" → Onboarding Step 3

4. **Onboarding Step 3** (`/pages/Onboarding.tsx` - currentStep: 3)
   - **Component:** Stepper (3 of 5)
   - **Question:** "Your current situation"
   - **Interactions:**
     - Multiple choice: "Have you had dental treatment before?" (Yes/No/Not sure)
     - Optional textarea: "Any concerns or medical conditions?"
   - **Validation:** Must select previous treatment option
   - **CTA:** "Continue" button
   - **Transition:** Click "Continue" → Onboarding Step 4

5. **Onboarding Step 4** (`/pages/Onboarding.tsx` - currentStep: 4)
   - **Component:** Stepper (4 of 5)
   - **Question:** "Contact & preferences"
   - **Interactions:**
     - Input: Name (required)
     - Input: Email (required)
     - Input: WhatsApp (optional)
     - Select: Preferred Language
   - **Validation:** Name and Email must be filled
   - **CTA:** "Continue" button
   - **Transition:** Click "Continue" → Onboarding Step 5

6. **Onboarding Step 5** (`/pages/Onboarding.tsx` - currentStep: 5)
   - **Component:** Stepper (5 of 5)
   - **Question:** "Review & confirm"
   - **Display:** Summary cards showing:
     - Treatment Interest (editable - returns to Step 1)
     - Your Goals (editable - returns to Step 2)
     - Contact Information (editable - returns to Step 4)
   - **Interaction:** Consent checkbox (required)
   - **CTA:** "See My Plan" button with CheckCircle icon
   - **Transition:** Click "See My Plan" → `/plan-dashboard`

7. **Plan Dashboard** (`/pages/PlanDashboard.tsx`)
   - User receives personalized treatment plan
   - Can download PDF, book consultation, or contact coordinator

---

## 🎨 Visual Specifications

### Transitions & Animations
All transitions respect `prefers-reduced-motion` CSS media query.

**Default Transitions:**
- Duration: 200ms
- Easing: ease-in-out
- Properties: colors, shadows, transforms

**Hover States:**
- Buttons: Background color change + shadow elevation
- Cards: Border color change + shadow elevation
- Links: Color change only

**Focus States:**
- 2px ring with accent-primary color
- 2px offset from element

**Loading States:**
- Dropzone: Pulse animation on upload icon
- Progress bar: Smooth width transition

### Spacing & Layout

**Container Widths:**
- Home Hero: 1440px max
- Content Sections: 1280px max
- Onboarding Form: 1024px max (4xl)
- FAQ Section: 1024px max (4xl)

**Vertical Spacing (Sections):**
- Desktop: 80px (py-20)
- Mobile: 64px (py-16)

**Card Padding:**
- Large Cards: 40px (p-10)
- Medium Cards: 32px (p-8)
- Small Cards: 24px (p-6)

**Grid Gaps:**
- Card Grids: 24px (gap-6)
- Form Fields: 20px (gap-5)
- Choice Cards: 16px (gap-4)

---

## 🖱️ Interaction States

### Button Component States

**Primary Button:**
```
Default:  bg-accent-primary text-white shadow-premium-sm
Hover:    bg-accent-hover shadow-premium-md
Disabled: bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed
Focus:    ring-2 ring-accent-primary ring-offset-2
```

**Secondary Button:**
```
Default:  bg-white text-accent-primary border-border-subtle shadow-premium-sm
Hover:    bg-bg-secondary border-accent-primary shadow-premium-md
Disabled: opacity-50 cursor-not-allowed
Focus:    ring-2 ring-accent-primary ring-offset-2
```

**Ghost Button:**
```
Default:  bg-transparent text-accent-primary
Hover:    bg-accent-soft
Disabled: opacity-50 cursor-not-allowed
Focus:    ring-2 ring-accent-primary ring-offset-2
```

### ChoiceCard Component States

```
Default:   border-border-subtle bg-white
Hover:     border-accent-primary shadow-premium-md
Selected:  border-accent-primary bg-accent-soft + checkmark icon
Disabled:  bg-bg-secondary opacity-50 cursor-not-allowed
```

### Input Component States

```
Default:   border-border-subtle bg-white
Hover:     border-accent-primary
Focus:     ring-2 ring-accent-primary border-transparent
Error:     border-error ring-error
Disabled:  bg-bg-secondary opacity-60 cursor-not-allowed
```

### Stepper Component States

```
Completed: bg-success text-white (checkmark icon)
Active:    bg-accent-primary text-white ring-4 ring-accent-soft
Upcoming:  bg-bg-secondary text-text-tertiary
```

---

## 📱 Responsive Behavior

### Breakpoints (Tailwind)
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px
- **2xl:** 1536px

### Home Page Responsiveness

**Desktop (lg+):**
- Split hero: 2 columns (grid-cols-2)
- Treatments: 3 columns (lg:grid-cols-3)
- Process: 3 columns
- Reviews: 3 columns

**Tablet (md):**
- Hero: 2 columns maintained
- Treatments: 2 columns (md:grid-cols-2)
- Process: 3 columns maintained
- Reviews: 2 columns

**Mobile (<md):**
- Hero: Stacked (1 column)
- Treatments: 1 column
- Process: 1 column
- Reviews: 1 column
- Navigation: Hamburger menu (TopNav mobile variant)

### Onboarding Responsiveness

**Desktop:**
- Form container: 1024px max-width
- ChoiceCards: 2 columns (md:grid-cols-2)
- Navigation buttons: Horizontal (flex-row)

**Mobile:**
- ChoiceCards: 1 column stacked
- Navigation buttons: Vertical (flex-col)
- Reduced padding on cards (p-6 → p-4)

---

## ♿ Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Focus indicators visible on all focusable elements
- Skip to content link (implemented in TopNav)

### Screen Readers
- Semantic HTML elements (nav, main, section, article)
- ARIA labels on icon-only buttons
- Form labels properly associated with inputs
- Error messages announced to screen readers

### Color Contrast
- Text on backgrounds: WCAG AA compliant (4.5:1 minimum)
- accent-primary on white: 7.2:1
- text-primary on white: 16:1
- text-secondary on white: 7.5:1

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🔗 Navigation System

### Custom Navigation Context
Location: `/App.tsx`

```tsx
const NavigationContext = createContext<{
  navigate: (path: string, params?: any) => void;
  currentPath: string;
  params: any;
}>();
```

### Available Routes
- `/` - Home
- `/treatments` - Treatments Overview
- `/treatment-detail` - Individual Treatment
- `/pricing` - Pricing Information
- `/process` - How It Works
- `/reviews` - Patient Reviews
- `/faq` - Frequently Asked Questions
- `/contact` - Contact Page
- `/upload-center` - Secure Upload
- `/onboarding` - 5-Step Consultation
- `/plan-dashboard` - Personalized Plan

### Link Component Usage
```tsx
import { Link } from '@/components/Link';

<Link to="/onboarding">Get Started</Link>
```

---

## 🎬 Animation Specifications

### Micro-interactions

**Button Click:**
- Scale: 0.98 on active state
- Duration: 100ms
- Easing: ease-in-out

**Card Hover:**
- Translate: 0 → -2px (y-axis)
- Shadow: sm → md elevation
- Duration: 200ms
- Easing: ease-out

**Accordion Expand:**
- Height: auto
- Chevron rotate: 0deg → 90deg
- Duration: 200ms
- Easing: ease-in-out

**Stepper Progress:**
- Background color transition: 200ms
- Ring appearance: fade-in 200ms
- Checkmark icon: scale-in 150ms

### Page Transitions
Currently: Instant (no page transitions)
Future: Consider subtle fade transitions if user testing indicates benefit

---

## 🎯 User Flow Metrics

### Form Completion Estimates
- **Step 1 (Treatment):** 15 seconds
- **Step 2 (Goals):** 45 seconds
- **Step 3 (Situation):** 30 seconds
- **Step 4 (Contact):** 30 seconds
- **Step 5 (Review):** 20 seconds
- **Total:** ~2 minutes (as advertised)

### Decision Points
1. Home CTA choice (Get Started vs Show Price Range)
2. Treatment selection (6 options)
3. Previous treatment history (3 options)
4. Consent checkbox (required)

### Exit Points
- Back button available on Steps 2-5
- Browser back button supported
- No progress lost (state maintained)

---

## 🧪 Testing Scenarios

### Happy Path
1. User clicks "Get Started" on home
2. Selects "Smile Makeover" treatment
3. Enters goals text (50-100 words)
4. Selects "Yes" for previous treatment
5. Enters name, email, WhatsApp
6. Reviews information
7. Checks consent box
8. Clicks "See My Plan"
9. Lands on Plan Dashboard

### Edge Cases
- Attempting to proceed without required fields
- Using browser back button mid-flow
- Editing previous steps from review screen
- Skipping optional fields (WhatsApp, concerns)
- Very long text in goal textarea
- Invalid email format

### Accessibility Testing
- Keyboard-only navigation through entire flow
- Screen reader announcement verification
- Focus trap in modal elements
- Color blindness simulation
- Reduced motion preference honored

---

## 📊 Design System Metrics

### Component Library
- **Total Components:** 13
- **Variants:** 28 (across all components)
- **Color Variables:** 16
- **Spacing Tokens:** 9
- **Radius Tokens:** 4
- **Shadow Tokens:** 3

### File Structure
```
/components/design-system/
  ├── Button.tsx
  ├── Stepper.tsx
  ├── ChoiceCard.tsx
  ├── Input.tsx
  ├── Dropzone.tsx
  ├── TrustBadge.tsx
  ├── ReviewCard.tsx
  ├── TopNav.tsx
  ├── LanguagePicker.tsx
  ├── ProcessCard.tsx
  ├── GuidedPanel.tsx
  ├── TrustStage.tsx
  └── index.ts
```

---

## 🚀 Future Enhancements

### Planned Features
- [ ] File upload functionality in Step 2
- [ ] Email validation with suggestions
- [ ] WhatsApp number formatting
- [ ] Progress save/resume functionality
- [ ] Multi-language support (i18n)
- [ ] Dark mode theme
- [ ] Onboarding analytics tracking
- [ ] A/B testing infrastructure

### Performance Optimizations
- [ ] Image lazy loading
- [ ] Component code splitting
- [ ] CSS purging for production
- [ ] Font subsetting
- [ ] CDN integration for assets

### Additional Prototypes
- [ ] Treatment Detail → Book Consultation flow
- [ ] FAQ → Contact flow
- [ ] Pricing → Get Started flow
- [ ] Plan Dashboard → Upload Documents flow
- [ ] Plan Dashboard → Schedule Appointment flow

---

## 📝 Notes

- All components are TypeScript typed for type safety
- Design tokens are CSS variables for easy theming
- Mobile-first responsive approach throughout
- Accessibility is built-in, not bolted on
- Performance is optimized for low-bandwidth users
- Trust and privacy messaging reinforced at every step
