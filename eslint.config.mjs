// ESLint configuration for bundle regression prevention
// Enforces import boundaries to prevent bundle leaks between public/admin/doctor routes

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', '.next/**', 'api/**'],
  },
  // Ignore eslint-disable directives for non-existent plugins (react-hooks, etc.)
  // We only enforce import boundaries, not other rules
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-warning-comments': 'off',
    },
  },
  // Enable TypeScript parsing for TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // No general TS rules - we only enforce import boundaries
      // Ignore missing plugin errors for eslint-disable directives
      'no-restricted-syntax': 'off',
    },
  },
  // Rule 1: Admin/Doctor modules must not import App.tsx
  {
    files: [
      'src/pages/Admin*.tsx',
      'src/pages/Doctor*.tsx',
      'src/components/admin-*/**/*.{ts,tsx}',
      'src/hooks/admin-*/**/*.{ts,tsx}',
      'src/lib/admin-*/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/App', './App', '../App', '../../App', '../../../App'],
              message:
                "Admin/Doctor modules must not import App.tsx (bundle leak risk). Use '@/lib/navigationContext' or a dedicated module instead.",
            },
          ],
        },
      ],
    },
  },
  // Rule 2: Doctor modules must not import public pages/components
  {
    files: [
      'src/pages/Doctor*.tsx',
      'src/components/doctor/**/*.{ts,tsx}',
      'src/lib/doctor-*/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/pages/Home',
                '@/pages/Process',
                '@/pages/Pricing',
                '@/pages/Onboarding',
                '@/pages/Contact',
                '@/pages/Reviews',
                '@/pages/FAQ',
                '@/pages/PlanDashboard',
                '@/pages/Treatments',
                '@/pages/TreatmentDetail',
                '@/components/trust/**',
                '@/components/design-system/**',
              ],
              message:
                "Doctor modules must not import public pages/components (bundle leak risk). Use shared utilities or dedicated modules instead.",
            },
          ],
        },
      ],
    },
  },
  // Rule 3: Public pages must not import admin/doctor modules
  {
    files: [
      'src/pages/Home.tsx',
      'src/pages/Process.tsx',
      'src/pages/Pricing.tsx',
      'src/pages/Onboarding.tsx',
      'src/pages/Contact.tsx',
      'src/pages/Reviews.tsx',
      'src/pages/FAQ.tsx',
      'src/pages/PlanDashboard.tsx',
      'src/pages/Treatments.tsx',
      'src/pages/TreatmentDetail.tsx',
      'src/pages/Intake.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/pages/Admin*',
                '@/pages/Doctor*',
                '@/pages/PatientPortal',
                '@/pages/UploadCenter',
                '@/components/admin-*/**',
                '@/components/doctor/**',
                '@/hooks/admin-*/**',
                '@/lib/admin-*/**',
              ],
              message:
                "Public pages must not import admin/doctor modules (bundle leak risk). Keep public and internal routes separated.",
            },
          ],
        },
      ],
    },
  },
];

