
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
    const localUrl = localStorage.getItem('custom_supabase_url');
    const envUrl = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '');

    const hasValidLocal = !!localUrl && localUrl.startsWith('https://');
    const hasValidEnv = !!envUrl && envUrl.startsWith('https://');

    return hasValidLocal || hasValidEnv;
};

export const getSupabaseClient = (): SupabaseClient => {
    if (supabaseInstance) return supabaseInstance;

    const localUrl = localStorage.getItem('custom_supabase_url');
    const localKey = localStorage.getItem('custom_supabase_key');

    const envUrl = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') || '';
    const envKey = (import.meta.env?.VITE_SUPABASE_KEY) || (typeof process !== 'undefined' ? process.env?.SUPABASE_KEY : '') || '';

    let finalUrl = localUrl || envUrl || 'https://placeholder.supabase.co';
    let finalKey = localKey || envKey || 'placeholder-key';

    if (!finalUrl.startsWith('http')) finalUrl = 'https://placeholder.supabase.co';

    try {
        supabaseInstance = createClient(finalUrl, finalKey);
    } catch (e) {
        console.error("Supabase Init Error:", e);
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
    }
    
    return supabaseInstance;
};

export const updateSupabaseConfig = (url: string, key: string) => {
    try {
        new URL(url);
        localStorage.setItem('custom_supabase_url', url);
        localStorage.setItem('custom_supabase_key', key);
        supabaseInstance = createClient(url, key);
        return true;
    } catch (e) {
        return false;
    }
};

export const supabase = getSupabaseClient();
