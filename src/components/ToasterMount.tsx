// src/components/ToasterMount.tsx
// Safe Toaster mount: if Sonner fails to load, app continues without toasts

import React from 'react';

export default function ToasterMount() {
  const [Toaster, setToaster] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    let alive = true;

    import('sonner')
      .then((m) => {
        if (!alive) return;
        setToaster(() => m.Toaster);
      })
      .catch((err) => {
        console.error('[ToasterMount] Sonner failed to load:', err);
        // swallow: no toaster, but app stays alive
      });

    return () => {
      alive = false;
    };
  }, []);

  if (!Toaster) return null;
  return <Toaster richColors position="top-right" closeButton />;
}

