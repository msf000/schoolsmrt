
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// متغير لتخزين العميل (Singleton)
let supabaseInstance: SupabaseClient | null = null;

// دالة للحصول على العميل الحالي (أو إنشائه إذا لم يوجد)
export const getSupabaseClient = (): SupabaseClient => {
    if (supabaseInstance) return supabaseInstance;

    // 1. محاولة القراءة من إعدادات المستخدم المحفوظة في المتصفح
    const localUrl = localStorage.getItem('custom_supabase_url');
    const localKey = localStorage.getItem('custom_supabase_key');

    // 2. محاولة القراءة من متغيرات البيئة
    const envUrl = process.env.SUPABASE_URL;
    const envKey = process.env.SUPABASE_KEY;

    // تحديد القيم النهائية (الأولوية للمدخلات اليدوية ثم البيئة)
    // استخدام قيم مؤقتة آمنة لمنع توقف التطبيق في حال عدم وجود إعدادات
    let finalUrl = localUrl || envUrl || 'https://placeholder.supabase.co';
    const finalKey = localKey || envKey || 'placeholder-key';

    // التحقق من صحة الرابط
    try {
        new URL(finalUrl);
    } catch (e) {
        console.warn('Invalid URL, using fallback placeholder');
        finalUrl = 'https://placeholder.supabase.co';
    }

    supabaseInstance = createClient(finalUrl, finalKey);
    return supabaseInstance;
};

// دالة لتحديث الإعدادات يدوياً من واجهة المدير
export const updateSupabaseConfig = (url: string, key: string) => {
    try {
        new URL(url); // Validate URL
        localStorage.setItem('custom_supabase_url', url);
        localStorage.setItem('custom_supabase_key', key);
        // إعادة إنشاء العميل بالإعدادات الجديدة
        supabaseInstance = createClient(url, key);
        return true;
    } catch (e) {
        return false;
    }
};

// تصدير متغير للتوافق (ولكن يفضل استخدام getSupabaseClient)
export const supabase = getSupabaseClient();
