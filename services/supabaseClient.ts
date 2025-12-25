
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// الإعدادات الخاصة بقاعدة بيانات المستخدم مباشرة
const SUPABASE_URL = 'https://rmrbczwgcuergzybvwwb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmJjendnY3Vlcmd6eWJ2d3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTU2NjYsImV4cCI6MjA4MDE3MTY2Nn0.nyk35NQFdBhMbsiV3b3Usa6aZ1ADra5tB3ter3dM710';

let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => true; // دائماً متصل الآن

export const getSupabaseClient = (): SupabaseClient => {
    if (supabaseInstance) return supabaseInstance;

    try {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
    } catch (e) {
        console.error("Supabase Init Error:", e);
        // Fallback placeholder
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
    }
    
    return supabaseInstance;
};

export const updateSupabaseConfig = (url: string, key: string) => {
    // هذه الدالة الآن للتوافق فقط، الاتصال ثابت
    return true;
};

export const supabase = getSupabaseClient();
