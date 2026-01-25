// src/components/BuildStamp.tsx
// Visible build info to never get lost between deployments

// Declare global constants that Vite injects at build time
// Using declare + typeof check prevents runtime crashes if not defined
declare const __BUILD_SHA__: string | undefined;
declare const __BUILD_BRANCH__: string | undefined;
declare const __BUILD_TIME__: string | undefined;
declare const __VERCEL_ENV__: string | undefined;

function BuildStamp() {
  // Safe read: use typeof check to prevent ReferenceError if global is not defined
  const sha = (typeof __BUILD_SHA__ !== 'undefined' && __BUILD_SHA__) || 'dev';
  const branch = (typeof __BUILD_BRANCH__ !== 'undefined' && __BUILD_BRANCH__) || 'local';
  const time = (typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__) || new Date().toISOString();
  const env = (typeof __VERCEL_ENV__ !== 'undefined' && __VERCEL_ENV__) || 'local';

  // Only show in dev/preview, or always (your choice)
  // For now: always visible but small
  
  return (
    <div className="text-xs text-gray-500 opacity-60 font-mono">
      {env !== 'production' && <span className="text-orange-600 font-semibold">[{env}]</span>}
      {' '}
      {branch}@{sha.slice(0, 7)}
      {' • '}
      {new Date(time).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}
    </div>
  );
}

// Export both default and named for compatibility
export default BuildStamp;
export { BuildStamp };
