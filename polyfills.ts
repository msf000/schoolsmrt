
// polyfills.ts
if (typeof window !== 'undefined') {
  // Simple polyfill for process.env if it doesn't exist
  // Note: Vite's 'define' plugin handles replacement of process.env.KEY in code,
  // but some libraries might check 'typeof process' or 'process.env' directly.
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = { env: {} };
  }
}
