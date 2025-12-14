
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
    const localUrl = localStorage.getItem('custom_supabase_url');
    const localKey = localStorage.getItem('custom_supabase_key');
    const envUrl = process.env.SUPABASE_URL;

    // Check if any valid URL exists (not placeholder and not empty)
    const hasValidLocal = !!localUrl && !localUrl.includes('placeholder');
    const hasValidEnv = !!envUrl && !envUrl.includes('placeholder');

    return hasValidLocal || hasValidEnv;
};

// Function to get or create the client
export const getSupabaseClient = (): SupabaseClient => {
    if (supabaseInstance) return supabaseInstance;

    // 1. Try local storage
    const localUrl = localStorage.getItem('custom_supabase_url');
    const localKey = localStorage.getItem('custom_supabase_key');

    // 2. Try env vars
    const envUrl = process.env.SUPABASE_URL;
    const envKey = process.env.SUPABASE_KEY;

    // Determine final values (Fallback to placeholder to allow app init, but requests will fail if used)
    let finalUrl = localUrl || envUrl || 'https://placeholder.supabase.co';
    const finalKey = localKey || envKey || 'placeholder-key';

    try {
        new URL(finalUrl);
    } catch (e) {
        console.warn('Invalid URL, using fallback placeholder');
        finalUrl = 'https://placeholder.supabase.co';
    }

    supabaseInstance = createClient(finalUrl, finalKey);
    return supabaseInstance;
};

// Function to update config manually
export const updateSupabaseConfig = (url: string, key: string) => {
    try {
        new URL(url); // Validate URL
        localStorage.setItem('custom_supabase_url', url);
        localStorage.setItem('custom_supabase_key', key);
        // Re-create client
        supabaseInstance = createClient(url, key);
        return true;
    } catch (e) {
        return false;
    }
};

// Export for compatibility
export const supabase = getSupabaseClient();
