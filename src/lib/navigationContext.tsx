import { createContext } from 'react';

// NavigationContext moved to separate file to avoid pulling App.tsx dependencies into admin chunk
// This allows admin pages to use navigation without importing all public pages from App.tsx
export const NavigationContext = createContext<{
  navigate: (path: string, params?: any) => void;
  currentPath: string;
  params: any;
}>({
  navigate: () => {
    console.warn('[NavigationContext] navigate called but context not provided');
  },
  currentPath: '/',
  params: {},
});

