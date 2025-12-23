
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

// دالة للتحقق من وجود الإعدادات
export const isSupabaseConfigured = (): boolean => {
    // التحقق من المتغيرات القادمة من Vercel أولاً
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_KEY;

    if (envUrl && envUrl.startsWith('https://') && envKey) {
        return true;
    }

    // التحقق من الإدخال اليدوي ثانياً
    const localUrl = localStorage.getItem('custom_supabase_url');
    return !!localUrl && localUrl.startsWith('https://');
};

export const getSupabaseClient = (): SupabaseClient => {
    if (supabaseInstance) return supabaseInstance;

    // 1. الأولوية القصوى لمتغيرات Vercel (Vite Env)
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_KEY;

    // 2. الأولوية الثانية للإدخال اليدوي
    const localUrl = localStorage.getItem('custom_supabase_url');
    const localKey = localStorage.getItem('custom_supabase_key');

    const finalUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : (localUrl || 'https://placeholder.supabase.co');
    const finalKey = (envUrl && envUrl.startsWith('http')) ? envKey : (localKey || 'placeholder');

    try {
        supabaseInstance = createClient(finalUrl, finalKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
    } catch (e) {
        console.error("Supabase Initialization Error:", e);
        // Fallback لمنع انهيار التطبيق
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
    }
    
    return supabaseInstance;
};

export const updateSupabaseConfig = (url: string, key: string) => {
    try {
        new URL(url);
        localStorage.setItem('custom_supabase_url', url);
        localStorage.setItem('custom_supabase_key', key);
        // إعادة تهيئة النسخة
        supabaseInstance = createClient(url, key);
        return true;
    } catch (e) {
        return false;
    }
};

export const supabase = getSupabaseClient();
