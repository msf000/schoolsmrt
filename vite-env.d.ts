
interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment NodeJS namespace for process.env compatibility in browser
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
    [key: string]: any;
  }
}
