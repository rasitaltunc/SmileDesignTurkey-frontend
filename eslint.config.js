// ESLint configuration for bundle regression prevention
// Restricts imports from App.tsx in admin/doctor modules to prevent bundle leaks

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', '.next/**'],
  },
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
];

