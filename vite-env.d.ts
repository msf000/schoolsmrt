
// Replaced vite/client reference to avoid missing definition error

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
    [key: string]: any;
  }
}
