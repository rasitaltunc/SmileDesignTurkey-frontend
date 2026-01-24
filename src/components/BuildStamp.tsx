// src/components/BuildStamp.tsx
// Visible build info to never get lost between deployments

function BuildStamp() {
  const sha = __BUILD_SHA__ || 'dev';
  const branch = __BUILD_BRANCH__ || 'local';
  const time = __BUILD_TIME__ || new Date().toISOString();
  const env = __VERCEL_ENV__ || 'local';

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
