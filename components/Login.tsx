
import React, { useState } from 'react';
import { authenticateUser, getSystemUsers, getStudents, setSystemMode, clearDatabase } from '../services/storageService';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, LayoutTemplate, AlertCircle, UserPlus, CloudLightning, Trash2 } from 'lucide-react';
import TeacherRegistration from './TeacherRegistration';

interface LoginProps {
  onLoginSuccess: (user: any, rememberMe: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN'); // Toggle State
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-login handler for registration success
  const handleRegisterSuccess = (email: string, pass: string) => {
      setIdentifier(email);
      setPassword(pass);
      setView('LOGIN');
      // Auto trigger login logic
      setTimeout(() => {
          document.getElementById('login-btn')?.click();
      }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // IMPORTANT: Ensure we are in Production Mode for normal login form
    setSystemMode(false);

    try {
        const cleanIdentifier = identifier.trim();

        // 1. Check Hardcoded Super Admin (Backdoor)
        if (cleanIdentifier.toLowerCase() === 'admin@school.com' && (password === 'SchoolSystem2025!' || password === '123')) {
            onLoginSuccess({ 
                id: 'admin', 
                name: 'المدير العام', 
                email: cleanIdentifier, 
                role: 'SUPER_ADMIN' 
            }, rememberMe);
            return;
        }

        // 2. Hybrid Authentication (Local -> Cloud)
        const user = await authenticateUser(cleanIdentifier, password);
        
        if (user) {
            onLoginSuccess(user, rememberMe);
        } else {
            setError('البيانات المدخلة غير صحيحة أو غير مسجلة.');
        }
    } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء تسجيل الدخول.');
    } finally {
        setLoading(false);
    }
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

  const handleReset = () => {
      if (confirm('تحذير: سيتم حذف جميع الحسابات والبيانات المخزنة محلياً.\nهل أنت متأكد من مسح كل شيء؟')) {
          clearDatabase();
          alert('تم مسح البيانات بنجاح.');
      }
  };

  // --- RENDER REGISTRATION VIEW ---
  if (view === 'REGISTER') {
      return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={handleRegisterSuccess} />;
  }

  // --- RENDER LOGIN VIEW ---
  return (
    // Fixed container to handle scrolling independently from body
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto custom-scrollbar" dir="rtl">
      <div className="min-h-full w-full flex flex-col justify-center items-center p-4 py-10">
      
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
            {/* Header */}
            <div className="bg-primary p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-[1px]"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm border border-white/30 mb-4 shadow-lg">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">نظام المدرس الذكي</h1>
                    <p className="text-teal-100 text-sm">بوابة الدخول الموحدة (سحابية)</p>
                </div>
            </div>

            {/* Form */}
            <div className="p-8">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold text-gray-800">تسجيل الدخول</h2>
                    <p className="text-gray-400 text-sm mt-1">أدخل بياناتك للدخول إلى النظام</p>
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

                    <div className="flex items-center justify-between">
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
                        id="login-btn"
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول للنظام <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform"/></>}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button 
                        onClick={() => setView('REGISTER')}
                        className="text-primary font-bold text-sm hover:underline flex items-center justify-center gap-1 w-full py-2 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <UserPlus size={16}/> معلم جديد؟ سجل حسابك الآن
                    </button>
                </div>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500 font-bold">أو جرب النظام (Demo)</span>
                    </div>
                </div>

                {/* Demo Access Buttons */}
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
                
                <div className="text-[10px] text-gray-400 text-center mt-4 flex items-center justify-center gap-3">
                    <span className="flex items-center gap-1"><CloudLightning size={12}/> المزامنة السحابية</span>
                    <button onClick={handleReset} className="text-red-300 hover:text-red-500 flex items-center gap-1 transition-colors" title="مسح كافة البيانات المحلية">
                        <Trash2 size={12}/> إعادة ضبط
                    </button>
                </div>
            </div>
        </div>
        
        <p className="mt-6 text-gray-400 text-xs text-center pb-6">Smart School System &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default Login;
