
import React, { useState } from 'react';
import { getSystemUsers, getStudents } from '../services/storageService';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users } from 'lucide-react';

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

    // Simulate network delay for better UX
    setTimeout(() => {
        const cleanIdentifier = identifier.trim();

        // 1. Check Hardcoded Super Admin (Backdoor or Fallback)
        // Accepts both the complex password OR simple '123' if storage fails
        if (cleanIdentifier.toLowerCase() === 'admin@school.com' && (password === 'SchoolSystem2025!' || password === '123')) {
            onLoginSuccess({ 
                id: 'admin', 
                name: 'المدير العام', 
                email: cleanIdentifier, 
                role: 'SUPER_ADMIN' 
            }, rememberMe);
            return;
        }

        // 2. Check System Users (Admins/Teachers)
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

        // 3. Check Students (By National ID)
        // Only if input looks like ID (digits only, e.g., 10 chars)
        if (/^\d{10}$/.test(cleanIdentifier)) {
            const students = getStudents();
            const foundStudent = students.find(s => s.nationalId === cleanIdentifier);

            if (foundStudent) {
                // Default Password: Last 4 digits of National ID if not set
                const defaultPass = foundStudent.nationalId ? foundStudent.nationalId.slice(-4) : '0000';
                const storedPassword = foundStudent.password || defaultPass;

                if (password === storedPassword) {
                    onLoginSuccess({
                        ...foundStudent,
                        role: 'STUDENT',
                        email: foundStudent.nationalId // Use ID as email identifier for session
                    }, rememberMe);
                } else {
                    setError('كلمة المرور غير صحيحة (الافتراضية: آخر 4 أرقام من الهوية)');
                    setLoading(false);
                }
                return;
            }
        }

        setError('البيانات المدخلة غير صحيحة أو غير مسجلة.');
        setLoading(false);
    }, 800);
  };

  const handleDemoLogin = (role: 'ADMIN' | 'TEACHER' | 'STUDENT') => {
      if (role === 'ADMIN') {
          setIdentifier('admin@school.com');
          setPassword('123');
      } else if (role === 'TEACHER') {
          setIdentifier('teacher@school.com');
          setPassword('123');
      } else if (role === 'STUDENT') {
          setIdentifier('1010101010');
          setPassword('1010');
      }
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
                <p className="text-gray-400 text-sm mt-1">أدخل البريد الإلكتروني أو رقم الهوية (للطلاب)</p>
            </div>

            {/* Quick Access Buttons */}
            <div className="mb-6 grid grid-cols-3 gap-2">
                <button onClick={() => handleDemoLogin('ADMIN')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-bold text-gray-600">
                    <ShieldCheck size={16} className="mb-1 text-red-500"/> مدير
                </button>
                <button onClick={() => handleDemoLogin('TEACHER')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-bold text-gray-600">
                    <User size={16} className="mb-1 text-blue-500"/> معلم
                </button>
                <button onClick={() => handleDemoLogin('STUDENT')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-bold text-gray-600">
                    <Users size={16} className="mb-1 text-green-500"/> طالب
                </button>
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

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-2">للطلاب:</p>
                <div className="inline-block bg-blue-50 rounded-lg p-2 px-4 border border-blue-100 text-xs text-blue-800">
                    كلمة المرور الافتراضية هي <b>آخر 4 أرقام</b> من رقم الهوية
                </div>
            </div>
        </div>
      </div>
      
      <p className="mt-6 text-gray-400 text-xs">Smart School System &copy; {new Date().getFullYear()}</p>
    </div>
  );
};

export default Login;
