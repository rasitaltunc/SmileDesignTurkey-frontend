# GuideHealth Design System - Quick Reference

## 🎨 Color Palette

```
PRIMARY COLORS
├─ Accent Primary: #2F6BFF ████ (Primary CTAs, Links)
├─ Accent Hover:   #2457D6 ████ (Hover States)
└─ Accent Soft:    #EAF0FF ████ (Backgrounds, Highlights)

TEXT COLORS
├─ Text Primary:   #0B1220 ████ (Headlines, Primary Text)
├─ Text Secondary: #475467 ████ (Body Text)
└─ Text Tertiary:  #667085 ████ (Subtle Text)

BACKGROUND COLORS
├─ BG Primary:     #FFFFFF ████ (Main Background)
├─ BG Secondary:   #F7F8FA ████ (Section Backgrounds)
└─ Overlay Wash:   #F9FAFB ████ (Subtle Overlays)

SEMANTIC COLORS
├─ Success:        #12B76A ████ (Success States)
├─ Warning:        #F79009 ████ (Warnings, Ratings)
└─ Error:          #F04438 ████ (Errors, Validation)

BORDER COLORS
└─ Border Subtle:  #E6E8EE ████ (Card Borders, Dividers)
```

---

## 📏 Spacing Scale (8pt Grid)

```
8px  ▮           --space-1  (Icon gaps)
12px ▮▮          --space-2  (Compact elements)
16px ▮▮▮         --space-3  (Default padding)
20px ▮▮▮▮        --space-4  (Form spacing)
24px ▮▮▮▮▮       --space-5  (Card padding)
32px ▮▮▮▮▮▮      --space-6  (Section padding)
40px ▮▮▮▮▮▮▮     --space-7  (Large spacing)
48px ▮▮▮▮▮▮▮▮    --space-8  (XL spacing)
64px ▮▮▮▮▮▮▮▮▮▮  --space-9  (Hero sections)
```

---

## 🔤 Typography Scale

```
H1     44px/52px  Semibold  "Premium Dental Care Abroad"
H2     32px/40px  Semibold  "Explore Our Treatments"
H3     24px/32px  Semibold  "What brings you here?"
Body   16px/24px  Regular   "Personalized treatment plans..."
Small  14px/22px  Regular   "Real stories from patients"
Label  12px/16px  Medium    "EMAIL ADDRESS"
Button 14px/20px  Semibold  "Get Started"
```

---

## 🎭 Component States

### Button
```
Primary Button:
  Default:  [bg:#2F6BFF text:white shadow:sm]
  Hover:    [bg:#2457D6 text:white shadow:md]
  Disabled: [bg:#E6E8EE text:#667085 opacity:50%]

Secondary Button:
  Default:  [bg:white text:#2F6BFF border:#E6E8EE]
  Hover:    [bg:#F7F8FA border:#2F6BFF shadow:md]
  Disabled: [bg:#F7F8FA text:#667085 opacity:50%]

Ghost Button:
  Default:  [bg:transparent text:#2F6BFF]
  Hover:    [bg:#EAF0FF text:#2F6BFF]
  Disabled: [bg:transparent text:#667085 opacity:50%]
```

### Input
```
Default:  [border:#E6E8EE]
Hover:    [border:#2F6BFF]
Focus:    [ring:#2F6BFF border:transparent]
Error:    [border:#F04438 ring:#F04438]
Disabled: [bg:#F7F8FA opacity:60%]
```

### ChoiceCard
```
Default:  [border:#E6E8EE bg:white]
Hover:    [border:#2F6BFF shadow:md]
Selected: [border:#2F6BFF bg:#EAF0FF + checkmark]
Disabled: [bg:#F7F8FA opacity:50%]
```

---

## 📦 Component Import Cheatsheet

```tsx
// All components in one import
import {
  Button,           // Primary, Secondary, Ghost
  Stepper,          // 1-5 steps with progress
  ChoiceCard,       // Selectable treatment cards
  Input,            // Form input with label/error
  Dropzone,         // File upload drag & drop
  TrustBadge,       // Small trust indicators
  ReviewCard,       // Patient testimonial card
  TopNav,           // Desktop/mobile navigation
  LanguagePicker,   // Language dropdown
  ProcessCard,      // "How It Works" step card
  GuidedPanel,      // Hero left side
  TrustStage,       // Hero right side
} from '@/components/design-system';
```

---

## 🎯 Common Patterns

### Split Hero Layout
```tsx
<section className="bg-overlay-wash">
  <div className="max-w-[1440px] mx-auto px-8 py-16">
    <div className="grid lg:grid-cols-2 gap-16">
      <GuidedPanel
        headline="Your Headline"
        subheadline="Your subheadline"
      >
        <Button variant="primary">Get Started</Button>
      </GuidedPanel>
      
      <TrustStage
        mediaUrl="/image.jpg"
        showBadges={true}
        showReviews={true}
      />
    </div>
  </div>
</section>
```

### Content Section
```tsx
<section className="py-20 bg-bg-primary">
  <div className="max-w-[1280px] mx-auto px-8">
    <div className="text-center mb-16">
      <h2>Section Title</h2>
      <p className="text-text-secondary text-lg">
        Section description
      </p>
    </div>
    
    {/* Your content grid here */}
  </div>
</section>
```

### Treatment Card Grid
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {treatments.map((treatment) => (
    <div className="bg-white rounded-[var(--radius-md)] p-8 border border-border-subtle hover:shadow-premium-md transition-all">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Form with Validation
```tsx
<Input
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  placeholder="your@email.com"
/>
```

### Stepper Flow
```tsx
<Stepper currentStep={3} totalSteps={5} />

{/* Show step 3 content */}

<Button 
  onClick={handleNext}
  disabled={!isStepValid}
>
  Continue
</Button>
```

---

## 🎨 CSS Variable Usage

```css
/* Background */
background: var(--bg-primary);
background: var(--bg-secondary);

/* Text */
color: var(--text-primary);
color: var(--text-secondary);
color: var(--text-tertiary);

/* Accent */
background: var(--accent-primary);
color: var(--accent-primary);
background: var(--accent-soft);

/* Spacing */
padding: var(--space-5);
margin-bottom: var(--space-6);
gap: var(--space-4);

/* Radius */
border-radius: var(--radius-md);
border-radius: var(--radius-xl);

/* Shadows */
box-shadow: var(--shadow-sm);
box-shadow: var(--shadow-md);
box-shadow: var(--shadow-lg);

/* Border */
border: 1px solid var(--border-subtle);
```

---

## 📱 Responsive Breakpoints

```tsx
// Tailwind breakpoints
sm:   640px   // Small tablets, large phones
md:   768px   // Tablets
lg:   1024px  // Laptops, small desktops
xl:   1280px  // Desktops
2xl:  1536px  // Large desktops

// Common patterns
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  // 1 col mobile, 2 cols tablet, 3 cols desktop
</div>

<div className="px-4 sm:px-6 lg:px-8">
  // Responsive padding
</div>

<div className="flex flex-col sm:flex-row gap-4">
  // Stack on mobile, horizontal on desktop
</div>
```

---

## ⚡ Quick Tips

### Spacing
- Use `py-20` (80px) for section padding on desktop
- Use `py-16` (64px) for section padding on mobile
- Use `gap-6` (24px) for card grids
- Use `gap-4` (16px) for form fields

### Shadows
- Default cards: `shadow-premium-sm`
- Hover states: `shadow-premium-md`
- Modals/dropdowns: `shadow-premium-lg`

### Text Colors
- Headlines: `text-text-primary`
- Body text: `text-text-secondary`
- Placeholders: `text-text-tertiary`
- Links/CTAs: `text-accent-primary`

### Border Radius
- Buttons/inputs: `rounded-[var(--radius-md)]` (16px)
- Cards: `rounded-[var(--radius-md)]` or `rounded-[var(--radius-lg)]`
- Hero images: `rounded-[var(--radius-xl)]` (24px)
- Small badges: `rounded-[var(--radius-sm)]` (10px)

### Transitions
- Default: `transition-all duration-200`
- Colors only: `transition-colors duration-200`
- Shadows: `transition-shadow duration-200`

---

## 🎯 Component Sizes

### Button Sizes
```tsx
<Button size="sm">Small Button</Button>    // px-3 py-2
<Button size="md">Medium Button</Button>   // px-5 py-3 (default)
<Button size="lg">Large Button</Button>    // px-6 py-4
```

### Icon Sizes in Components
- Card icons: `w-6 h-6` or `w-7 h-7`
- Button icons: `w-4 h-4` or `w-5 h-5`
- Badge icons: `w-3.5 h-3.5`
- Hero icons: `w-12 h-12` (icon container)

---

## 🔧 Common CSS Classes

```css
/* Layout */
.max-w-[1440px]  /* Hero sections */
.max-w-[1280px]  /* Content sections */
.max-w-4xl       /* Forms, onboarding */

/* Grid */
.grid.md:grid-cols-2.lg:grid-cols-3.gap-6

/* Flex */
.flex.items-center.justify-between.gap-4

/* Spacing */
.py-20.px-8      /* Section padding */
.p-8.md:p-10     /* Card padding */

/* Text */
.text-center.mb-16.max-w-3xl.mx-auto  /* Section headers */

/* Interactive */
.hover:shadow-premium-md.transition-all.duration-200
```

---

## 📋 Checklist for New Pages

- [ ] Import design system components
- [ ] Use TopNav component
- [ ] Apply consistent spacing (py-20 sections)
- [ ] Use color variables (not hardcoded hex)
- [ ] Add hover states to interactive elements
- [ ] Include trust badges where appropriate
- [ ] Ensure responsive layout (grid/flex)
- [ ] Add Footer component
- [ ] Test keyboard navigation
- [ ] Verify color contrast

---

## 🚀 Performance Tips

```tsx
// Lazy load images
<img loading="lazy" src="..." alt="..." />

// Optimize with Next.js Image (if using Next)
import Image from 'next/image';
<Image src="..." width={600} height={400} />

// Defer non-critical scripts
<script defer src="..." />

// Use CSS containment for cards
.card {
  contain: layout style paint;
}
```

---

## 📖 Documentation Links

- **Full Documentation:** [INDEX.md](./INDEX.md)
- **Foundations:** [README.md](./README.md)
- **Prototype Flows:** [PROTOTYPE.md](./PROTOTYPE.md)
- **Component Code:** `/components/design-system/`
- **Styles:** `/styles/globals.css`

---

**Quick Reference Version:** 1.0.0  
**Last Updated:** December 16, 2024
