
// Replaced vite/client reference to avoid missing definition error

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Define process for Vercel/Node environment compatibility in frontend code
// We augment the global NodeJS.ProcessEnv interface instead of redeclaring the process variable
// to avoid conflicts with @types/node (which causes the "redeclare" error) and to ensure
// process.cwd() remains available for vite.config.ts.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
    [key: string]: any;
  }
}

// Fix for remark-gfm missing types in TypeScript build
declare module 'remark-gfm' {
  const remarkGfm: any;
  export default remarkGfm;
}
