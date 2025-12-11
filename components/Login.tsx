
import React, { useState } from 'react';
import { authenticateUser, getStudents, setSystemMode, clearDatabase } from '../services/storageService';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, LayoutTemplate, AlertCircle, UserPlus, CloudLightning, Trash2, Baby, Phone } from 'lucide-react';
import TeacherRegistration from './TeacherRegistration';

interface LoginProps {
  onLoginSuccess: (user: any, rememberMe: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN'); 
  const [roleMode, setRoleMode] = useState<'STAFF' | 'STUDENT' | 'PARENT'>('STAFF');
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-login handler for registration success
  const handleRegisterSuccess = (email: string, pass: string) => {
      setRoleMode('STAFF');
      setIdentifier(email);
      setPassword(pass);
      setView('LOGIN');
      setTimeout(() => {
          document.getElementById('login-btn')?.click();
      }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSystemMode(true); // Default to Online mode for Cloud login

    try {
        const cleanIdentifier = identifier.trim();

        // 1. Parent Login Logic (Needs local students synced or cloud fetch)
        // Since getStudents() uses cached local data, we rely on initAutoSync having run or fallback
        if (roleMode === 'PARENT') {
            const allStudents = getStudents();
            const children = allStudents.filter(s => s.parentPhone === cleanIdentifier || s.parentPhone?.replace(/\s/g, '') === cleanIdentifier);
            
            if (children.length > 0) {
                onLoginSuccess({ 
                    id: `parent_${cleanIdentifier}`, 
                    name: children[0].parentName || 'ولي أمر', 
                    role: 'PARENT',
                    email: cleanIdentifier, 
                    phone: cleanIdentifier
                }, rememberMe);
                setLoading(false);
                return;
            } else {
                // If local cache is empty, we might fail here. 
                // But typically initAutoSync runs on App load.
                setError('رقم الجوال غير مسجل كولي أمر لأي طالب (تأكد من المزامنة).');
                setLoading(false);
                return;
            }
        }

        // 2. Staff/Student Logic (Cloud Auth)
        const user = await authenticateUser(cleanIdentifier, password);
        
        if (user) {
            if (roleMode === 'STUDENT' && user.role !== 'STUDENT') {
                setError('هذا الحساب ليس حساب طالب.');
            } else if (roleMode === 'STAFF' && user.role === 'STUDENT') {
                setError('هذا الحساب مخصص للطلاب. الرجاء الدخول من تبويب الطالب.');
            } else {
                onLoginSuccess(user, rememberMe);
            }
        } else {
            setError('البيانات المدخلة غير صحيحة أو خطأ في الاتصال بالسحابة.');
        }
    } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء تسجيل الدخول.');
    } finally {
        setLoading(false);
    }
  };

  const handleReset = () => {
      if (confirm('تحذير: سيتم تصفير الذاكرة المؤقتة للمتصفح. هل أنت متأكد؟')) {
          clearDatabase();
          alert('تم مسح البيانات بنجاح.');
      }
  };

  if (view === 'REGISTER') {
      return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={handleRegisterSuccess} />;
  }

  return (
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
                    <h1 className="text-2xl font-bold text-white mb-1">نظام المدرس الذكي (Cloud)</h1>
                    <p className="text-teal-100 text-sm">بوابة الدخول الموحدة</p>
                </div>
            </div>

            {/* Role Switcher */}
            <div className="flex border-b">
                <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${roleMode === 'STAFF' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <User size={18}/> الكادر التعليمي
                </button>
                <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${roleMode === 'STUDENT' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Users size={18}/> الطلاب
                </button>
                <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${roleMode === 'PARENT' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Baby size={18}/> ولي الأمر
                </button>
            </div>

            {/* Form */}
            <div className="p-8">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        {roleMode === 'STAFF' ? 'دخول المعلمين والإداريين' : roleMode === 'STUDENT' ? 'دخول الطلاب' : 'دخول أولياء الأمور'}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {roleMode === 'PARENT' ? 'أدخل رقم الجوال المسجل في النظام' : 'أدخل بياناتك للدخول إلى النظام'}
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                            {roleMode === 'PARENT' ? 'رقم الجوال' : 'البريد الإلكتروني / الهوية'}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                {roleMode === 'PARENT' ? <Phone size={18} className="text-gray-400"/> : <User size={18} className="text-gray-400" />}
                            </div>
                            <input 
                                type={roleMode === 'PARENT' ? "tel" : "text"}
                                required
                                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dir-ltr text-right"
                                placeholder={roleMode === 'PARENT' ? "05xxxxxxxx" : "user@email.com"}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                    </div>

                    {roleMode !== 'PARENT' && (
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
                    )}

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
                        className={`w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group ${
                            roleMode === 'STUDENT' ? 'bg-purple-600 hover:bg-purple-700' :
                            roleMode === 'PARENT' ? 'bg-green-600 hover:bg-green-700' :
                            'bg-gray-900 hover:bg-black'
                        }`}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول للنظام <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform"/></>}
                    </button>
                </form>

                {roleMode === 'STAFF' && (
                    <div className="mt-4 text-center">
                        <button 
                            onClick={() => setView('REGISTER')}
                            className="text-primary font-bold text-sm hover:underline flex items-center justify-center gap-1 w-full py-2 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                            <UserPlus size={16}/> معلم جديد؟ سجل حسابك الآن
                        </button>
                    </div>
                )}
                
                <div className="text-[10px] text-gray-400 text-center mt-8 flex items-center justify-center gap-3 border-t pt-4">
                    <span className="flex items-center gap-1 text-green-600"><CloudLightning size={12}/> متصل بالسحابة</span>
                    <button onClick={handleReset} className="text-red-300 hover:text-red-500 flex items-center gap-1 transition-colors" title="مسح كافة البيانات المحلية">
                        <Trash2 size={12}/> إعادة ضبط
                    </button>
                </div>
            </div>
        </div>
        
        <p className="mt-6 text-gray-400 text-xs text-center pb-6">Smart School System (Cloud) &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default Login;
