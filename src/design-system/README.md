# GuideHealth Design System

Premium, Minimal Health Tourism Design System

## 📐 01 Foundations

### Typography
**Font Family:** Inter (or system fallback)

**Type Styles:**
- **H1**: 44px / 52px line-height, Semibold (600), -2% letter-spacing
- **H2**: 32px / 40px line-height, Semibold (600), -1% letter-spacing
- **H3**: 24px / 32px line-height, Semibold (600)
- **Body**: 16px / 24px line-height, Regular (400)
- **Body SM**: 14px / 22px line-height, Regular (400)
- **Label**: 12px / 16px line-height, Medium (500), uppercase, +1% letter-spacing
- **Button**: 14px / 20px line-height, Semibold (600)

### Colors

**Backgrounds:**
```css
--bg-primary: #FFFFFF
--bg-secondary: #F7F8FA
```

**Surface:**
```css
--surface-primary: #FFFFFF
```

**Borders:**
```css
--border-subtle: #E6E8EE
```

**Text:**
```css
--text-primary: #0B1220
--text-secondary: #475467
--text-tertiary: #667085
```

**Accent:**
```css
--accent-primary: #2F6BFF
--accent-hover: #2457D6
--accent-soft: #EAF0FF
```

**Semantic:**
```css
--success: #12B76A
--warning: #F79009
--error: #F04438
```

**Overlay:**
```css
--overlay-wash: #F9FAFB
```

### Spacing Scale (8pt Grid)
```css
--space-1: 8px
--space-2: 12px
--space-3: 16px
--space-4: 20px
--space-5: 24px
--space-6: 32px
--space-7: 40px
--space-8: 48px
--space-9: 64px
```

### Border Radius
```css
--radius-sm: 10px
--radius-md: 16px
--radius-lg: 20px
--radius-xl: 24px
```

### Shadows (Premium, Soft)
```css
--shadow-sm: 0 1px 2px rgba(11, 18, 32, 0.04), 0 1px 4px rgba(11, 18, 32, 0.02)
--shadow-md: 0 2px 4px rgba(11, 18, 32, 0.04), 0 4px 12px rgba(11, 18, 32, 0.06)
--shadow-lg: 0 4px 8px rgba(11, 18, 32, 0.04), 0 8px 24px rgba(11, 18, 32, 0.08)
```

---

## 🧩 02 Components

### C/Buttons/Primary
**Path:** `/components/design-system/Button.tsx`
- **Variants:** Primary, Secondary, Ghost
- **States:** default, hover, disabled
- **Sizes:** sm, md, lg
- **Usage:**
```tsx
import { Button } from '@/components/design-system';

<Button variant="primary" size="md">Get Started</Button>
<Button variant="secondary" size="md">Learn More</Button>
<Button variant="ghost" size="sm">Cancel</Button>
```

### C/Stepper
**Path:** `/components/design-system/Stepper.tsx`
- **Variants:** 1of5, 2of5, 3of5, 4of5, 5of5
- **Usage:**
```tsx
import { Stepper } from '@/components/design-system';

<Stepper currentStep={3} totalSteps={5} />
```

### C/Card/ChoiceCard
**Path:** `/components/design-system/ChoiceCard.tsx`
- **States:** default, hover, selected, disabled
- **Usage:**
```tsx
import { ChoiceCard } from '@/components/design-system';

<ChoiceCard
  title="Smile Makeover"
  description="Complete dental transformation"
  icon={<Smile />}
  selected={true}
  onClick={handleSelect}
/>
```

### C/Form/Input
**Path:** `/components/design-system/Input.tsx`
- **States:** default, focus, error
- **Usage:**
```tsx
import { Input } from '@/components/design-system';

<Input
  label="Email Address"
  placeholder="Enter your email"
  error="Invalid email format"
/>
```

### C/Upload/Dropzone
**Path:** `/components/design-system/Dropzone.tsx`
- **States:** empty, uploading, uploaded, error
- **Usage:**
```tsx
import { Dropzone } from '@/components/design-system';

<Dropzone
  maxFiles={5}
  acceptedTypes={['image/*', 'application/pdf']}
  onUpload={handleUpload}
/>
```

### C/Trust/Badge
**Path:** `/components/design-system/TrustBadge.tsx`
- **Variants:** default, success, accent
- **Usage:**
```tsx
import { TrustBadge } from '@/components/design-system';

<TrustBadge
  icon={<Shield />}
  text="Data stays private"
  variant="accent"
/>
```

### C/Social/ReviewCard
**Path:** `/components/design-system/ReviewCard.tsx`
- **Usage:**
```tsx
import { ReviewCard } from '@/components/design-system';

<ReviewCard
  name="Sarah M."
  location="United Kingdom"
  rating={5}
  review="Amazing experience!"
  treatment="Smile Makeover"
  image="/avatar.jpg"
/>
```

### C/TopNav
**Path:** `/components/design-system/TopNav.tsx`
- **Variants:** desktop, mobile
- **Usage:**
```tsx
import { TopNav } from '@/components/design-system';

<TopNav variant="desktop" />
```

### C/Picker/Language
**Path:** `/components/design-system/LanguagePicker.tsx`
- **Languages:** EN, ES, DE, FR
- **Usage:**
```tsx
import { LanguagePicker } from '@/components/design-system';

<LanguagePicker />
```

### C/Roadmap/Card
**Path:** `/components/design-system/ProcessCard.tsx`
- **Usage:**
```tsx
import { ProcessCard } from '@/components/design-system';

<ProcessCard
  step={1}
  title="Share Your Case"
  description="Complete a simple consultation"
  icon={<Upload />}
/>
```

### GuidedPanel (Composite)
**Path:** `/components/design-system/GuidedPanel.tsx`
- **Usage:** Left side of split hero
```tsx
import { GuidedPanel } from '@/components/design-system';

<GuidedPanel
  currentStep={1}
  headline="Premium Dental Care Abroad"
  subheadline="Guided every step of the way"
  showTrustLine={true}
>
  {/* CTA buttons here */}
</GuidedPanel>
```

### TrustStage (Composite)
**Path:** `/components/design-system/TrustStage.tsx`
- **Usage:** Right side of split hero
```tsx
import { TrustStage } from '@/components/design-system';

<TrustStage
  mediaUrl="/hero-image.jpg"
  showBadges={true}
  showReviews={true}
/>
```

---

## 📱 03 Screens (Hi-Fi)

### Home Screen
**Path:** `/pages/Home.tsx`

**Layout Structure:**
1. **TopNav** - Navigation with logo, links, language picker, CTA
2. **Split Hero** (1440px max-width)
   - **Left:** GuidedPanel with headline, subheadline, CTAs, trust badges
   - **Right:** TrustStage with hero image, certification badges, review preview
3. **Treatments Grid** - 3 columns, treatment cards with icons
4. **3-Step Process** - ProcessCard components showing journey
5. **Reviews Teaser** - ReviewCard grid with testimonials
6. **FAQ Teaser** - Accordion with common questions
7. **Final CTA** - Gradient background with prominent call-to-action
8. **Footer** - Links and company information

**Spacing:**
- Section padding: 80px (vertical) for desktop
- Content max-width: 1280px
- Grid gaps: 24px (cards), 32px (sections)
- Hero grid gap: 64px

**Visual Characteristics:**
- High whitespace for premium feel
- Soft shadows on cards (shadow-premium-sm/md)
- Subtle borders (border-subtle)
- Accent color used sparingly for CTAs and highlights
- Smooth transitions (200ms duration)

---

## 🎨 04 Prototype

### Interaction: Home → Onboarding
**From:** Home screen "Get Started" CTA button  
**To:** `/onboarding` (Onboarding Step 1)  
**Transition:** Instant (respects prefers-reduced-motion)

### States & Animations
- **Hover states:** All interactive elements have hover feedback
- **Focus states:** Visible focus rings for accessibility
- **Loading states:** Progress indicators in Dropzone component
- **Error states:** Red borders and error messages in forms

### Accessibility
- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management
- Reduced motion support via CSS media query

---

## 🎯 Design Principles

1. **Premium & Minimal**: High whitespace, subtle shadows, refined typography
2. **Trust-First**: Privacy badges, certifications, and testimonials prominently displayed
3. **Anxiety-Reducing**: Clear process steps, reassuring copy, supportive tone
4. **Responsive**: Mobile-first approach with desktop enhancements
5. **Accessible**: WCAG 2.1 AA compliant, keyboard navigable
6. **Performant**: Optimized images, efficient CSS, minimal JavaScript

---

## 📦 Usage

Import components from the design system:

```tsx
import {
  Button,
  Stepper,
  ChoiceCard,
  Input,
  Dropzone,
  TrustBadge,
  ReviewCard,
  TopNav,
  LanguagePicker,
  ProcessCard,
  GuidedPanel,
  TrustStage
} from '@/components/design-system';
```

All foundation variables are available via CSS variables defined in `/styles/globals.css`.

---

## 🚀 Next Steps

- [ ] Apply design system to remaining 10 pages
- [ ] Create additional component variants as needed
- [ ] Build out prototyping flows for key user journeys
- [ ] Conduct usability testing with target users
- [ ] Refine micro-interactions and animations
- [ ] Create dark mode variants (foundation already supports it)
