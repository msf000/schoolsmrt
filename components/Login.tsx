
import React, { useState } from 'react';
import { getSystemUsers, getStudents, getTeachers, setSystemMode } from '../services/storageService';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, LayoutTemplate } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, rememberMe: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('admin@school.com'); // Pre-fill for UX
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // IMPORTANT: Ensure we are in Production Mode for normal login form
    setSystemMode(false);

    // Simulate network delay for better UX
    setTimeout(() => {
        const cleanIdentifier = identifier.trim();

        // 1. Check Hardcoded Super Admin (Backdoor or Fallback)
        if (cleanIdentifier.toLowerCase() === 'admin@school.com' && (password === 'SchoolSystem2025!' || password === '123')) {
            onLoginSuccess({ 
                id: 'admin', 
                name: 'المدير العام', 
                email: cleanIdentifier, 
                role: 'SUPER_ADMIN' 
            }, rememberMe);
            return;
        }

        // 2. Check System Users (Admins/Teachers via SystemUser table)
        const users = getSystemUsers();
        const foundUser = users.find(u => u.email.toLowerCase().trim() === cleanIdentifier.toLowerCase());

        if (foundUser) {
            const storedPassword = foundUser.password || '123456';
            if (password === storedPassword) {
                onLoginSuccess(foundUser, rememberMe);
            } else {
                setError('كلمة المرور غير صحيحة');
                setLoading(false);
            }
            return;
        }

        // 3. Check Teachers (via Teachers table - new method)
        // Teachers can login with National ID or Email
        const teachers = getTeachers();
        const foundTeacher = teachers.find(t => 
            (t.nationalId && t.nationalId === cleanIdentifier) || 
            (t.email && t.email.toLowerCase().trim() === cleanIdentifier.toLowerCase())
        );

        if (foundTeacher) {
            // Check password if set, otherwise default
            const storedPassword = foundTeacher.password || '123456';
            if (password === storedPassword) {
                onLoginSuccess({
                    ...foundTeacher,
                    role: 'TEACHER', // Map to system role
                    email: foundTeacher.email || foundTeacher.nationalId // Ensure identifier exists
                }, rememberMe);
                return;
            } else {
                // If found but password wrong, fail here
                setError('كلمة المرور غير صحيحة');
                setLoading(false);
                return;
            }
        }

        // 4. Check Students (By National ID)
        if (/^\d{10}$/.test(cleanIdentifier)) {
            const students = getStudents();
            const foundStudent = students.find(s => s.nationalId === cleanIdentifier);

            if (foundStudent) {
                const defaultPass = foundStudent.nationalId ? foundStudent.nationalId.slice(-4) : '0000';
                const storedPassword = foundStudent.password || defaultPass;

                if (password === storedPassword) {
                    onLoginSuccess({
                        ...foundStudent,
                        role: 'STUDENT',
                        email: foundStudent.nationalId 
                    }, rememberMe);
                } else {
                    setError('كلمة المرور غير صحيحة (الافتراضية: آخر 4 أرقام من الهوية)');
                    setLoading(false);
                }
                return;
            }
        }

        setError('البيانات المدخلة غير صحيحة أو غير مسجلة في النظام.');
        setLoading(false);
    }, 800);
  };

  const handleDemoLogin = (role: 'MANAGER' | 'TEACHER' | 'STUDENT') => {
      setLoading(true);
      
      // 1. Activate Demo Mode & Auto-Seed
      setSystemMode(true);

      setTimeout(() => {
          // 2. Get fake users created by storageService (now accessible due to mode switch)
          if (role === 'MANAGER') {
              const u = getSystemUsers().find(u => u.email === 'manager@demo.com');
              if(u) onLoginSuccess({ ...u, isDemo: true }, false);
          } else if (role === 'TEACHER') {
              const u = getSystemUsers().find(u => u.email === 'teacher@demo.com');
              if(u) onLoginSuccess({ ...u, isDemo: true }, false);
          } else if (role === 'STUDENT') {
              const s = getStudents().find(s => s.nationalId === '1010101010');
              if(s) onLoginSuccess({ ...s, role: 'STUDENT', email: s.nationalId, isDemo: true }, false);
          }
          setLoading(false);
      }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4" dir="rtl">
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
        {/* Header */}
        <div className="bg-primary p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-[1px]"></div>
            <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm border border-white/30 mb-4 shadow-lg">
                    <GraduationCap size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">نظام المدرس الذكي</h1>
                <p className="text-teal-100 text-sm">بوابة الدخول الموحدة</p>
            </div>
        </div>

        {/* Form */}
        <div className="p-8">
            <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-gray-800">تسجيل الدخول</h2>
                <p className="text-gray-400 text-sm mt-1">أدخل بياناتك للدخول إلى النظام الحقيقي</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">البريد الإلكتروني / رقم الهوية</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <User size={18} className="text-gray-400" />
                        </div>
                        <input 
                            type="text" 
                            required
                            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dir-ltr text-right"
                            placeholder="user@email.com OR 1012345678"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">كلمة المرور</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Lock size={18} className="text-gray-400" />
                        </div>
                        <input 
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dir-ltr text-right"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center">
                    <button 
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        {rememberMe ? <CheckSquare size={18} className="text-primary"/> : <Square size={18} className="text-gray-400"/>}
                        تذكر بيانات دخولي
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-pulse">
                        <ShieldCheck size={16} />
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول للنظام <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform"/></>}
                </button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500 font-bold">أو جرب النظام (Demo)</span>
                </div>
            </div>

            {/* Demo Access Buttons (Separated Data) */}
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleDemoLogin('MANAGER')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors text-xs font-bold text-purple-700 group">
                    <LayoutTemplate size={20} className="mb-2 group-hover:scale-110 transition-transform"/> تجربة مدير
                </button>
                <button onClick={() => handleDemoLogin('TEACHER')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors text-xs font-bold text-blue-700 group">
                    <User size={20} className="mb-2 group-hover:scale-110 transition-transform"/> تجربة معلم
                </button>
                <button onClick={() => handleDemoLogin('STUDENT')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-100 transition-colors text-xs font-bold text-green-700 group">
                    <Users size={20} className="mb-2 group-hover:scale-110 transition-transform"/> تجربة طالب
                </button>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center mt-4">
                تنبيه: البيانات في وضع التجربة وهمية ومنفصلة تماماً عن بيانات النظام الحقيقية.
            </p>
        </div>
      </div>
      
      <p className="mt-6 text-gray-400 text-xs">Smart School System &copy; {new Date().getFullYear()}</p>
    </div>
  );
};

export default Login;
