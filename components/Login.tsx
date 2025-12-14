
import React, { useState } from 'react';
import { authenticateUser, getStudents, setSystemMode, clearDatabase, authenticateStudent, initAutoSync } from '../services/storageService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, AlertCircle, UserPlus, CloudLightning, Trash2, Baby, Phone } from 'lucide-react';
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
  const [statusMessage, setStatusMessage] = useState('');

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
    setStatusMessage('جاري التحقق...');
    setSystemMode(true); // Default to Online mode

    try {
        const cleanIdentifier = identifier.trim();

        // 1. Parent Login Logic
        if (roleMode === 'PARENT') {
            let allStudents = getStudents();
            if (allStudents.length === 0 && isSupabaseConfigured()) {
                 setStatusMessage('مزامنة البيانات...');
                 await initAutoSync();
                 allStudents = getStudents();
            }

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
                setError('رقم الجوال غير مسجل.');
                setLoading(false);
                return;
            }
        }

        // 2. Student Login Logic
        if (roleMode === 'STUDENT') {
            const studentUser = await authenticateStudent(cleanIdentifier, password);
            if (studentUser) {
                onLoginSuccess(studentUser, rememberMe);
                setLoading(false);
                return;
            } else {
                setError('بيانات الطالب غير صحيحة.');
                setLoading(false);
                return;
            }
        }

        // 3. Staff Logic
        const user = await authenticateUser(cleanIdentifier, password);
        
        if (user) {
            if (user.role === 'STUDENT') {
                setError('يرجى الدخول من تبويب الطالب.');
                setLoading(false);
            } else {
                setStatusMessage('تحميل البيانات...');
                const syncSuccess = await initAutoSync();
                onLoginSuccess(user, rememberMe);
                setLoading(false);
            }
        } else {
            if (!isSupabaseConfigured()) {
                setError('خطأ في إعدادات الاتصال.');
            } else {
                setError('بيانات الدخول غير صحيحة.');
            }
            setLoading(false);
        }
    } catch (e: any) {
        console.error(e);
        setError('خطأ غير متوقع: ' + e.message);
        setLoading(false);
    }
  };

  const handleReset = () => {
      if (confirm('هل أنت متأكد من مسح جميع البيانات المحلية؟')) {
          clearDatabase();
      }
  };

  if (view === 'REGISTER') {
      return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={handleRegisterSuccess} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto custom-scrollbar flex flex-col justify-center min-h-[100dvh]" dir="rtl">
      <div className="w-full max-w-md mx-auto p-4">
      
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-fade-in relative">
            
            {/* Header */}
            <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-[2px]"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/40 mb-3 shadow-lg">
                        <GraduationCap size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">نظام المتابع الذكي</h1>
                    <p className="text-indigo-100 text-xs font-medium">بوابة الدخول الموحدة</p>
                </div>
            </div>

            {/* Role Switcher */}
            <div className="flex border-b bg-gray-50/50">
                <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-4 text-xs font-bold flex flex-col gap-1 items-center justify-center transition-all ${roleMode === 'STAFF' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <User size={20}/> المعلمين
                </button>
                <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-4 text-xs font-bold flex flex-col gap-1 items-center justify-center transition-all ${roleMode === 'STUDENT' ? 'text-purple-600 border-b-2 border-purple-600 bg-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <Users size={20}/> الطلاب
                </button>
                <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-4 text-xs font-bold flex flex-col gap-1 items-center justify-center transition-all ${roleMode === 'PARENT' ? 'text-green-600 border-b-2 border-green-600 bg-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <Baby size={20}/> ولي الأمر
                </button>
            </div>

            {/* Form */}
            <div className="p-6 md:p-8">
                <div className="mb-6 text-center">
                    <h2 className="text-lg font-bold text-gray-800">
                        {roleMode === 'STAFF' ? 'أهلاً بك أيها المعلم 👋' : roleMode === 'STUDENT' ? 'مرحباً بك يا بطل 🌟' : 'حياكم الله أولياء الأمور 👨‍👩‍👧‍👦'}
                    </h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">
                            {roleMode === 'PARENT' ? 'رقم الجوال' : roleMode === 'STUDENT' ? 'رقم الهوية / السجل' : 'البريد أو الهوية'}
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                {roleMode === 'PARENT' ? <Phone size={18} className="text-gray-400 group-focus-within:text-indigo-500"/> : <User size={18} className="text-gray-400 group-focus-within:text-indigo-500" />}
                            </div>
                            <input 
                                type={roleMode === 'PARENT' ? "tel" : "text"}
                                required
                                className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all dir-ltr text-right text-sm font-bold text-gray-800"
                                placeholder={roleMode === 'PARENT' ? "05xxxxxxxx" : roleMode === 'STUDENT' ? "10xxxxxxxx" : "user@email.com"}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                    </div>

                    {roleMode !== 'PARENT' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">
                                كلمة المرور
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-gray-400 group-focus-within:text-indigo-500" />
                                </div>
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pr-10 pl-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all dir-ltr text-right text-sm font-bold text-gray-800"
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

                    <div className="flex items-center justify-between pt-1">
                        <button 
                            type="button"
                            onClick={() => setRememberMe(!rememberMe)}
                            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            {rememberMe ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16} className="text-gray-400"/>}
                            تذكرني
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2 border border-red-100 animate-pulse">
                            <ShieldCheck size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        id="login-btn"
                        type="submit" 
                        disabled={loading}
                        className={`w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group ${
                            roleMode === 'STUDENT' ? 'bg-purple-600 hover:bg-purple-700' :
                            roleMode === 'PARENT' ? 'bg-green-600 hover:bg-green-700' :
                            'bg-indigo-900 hover:bg-black'
                        }`}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform"/></>}
                    </button>
                    
                    {loading && statusMessage && (
                        <div className="text-center text-[10px] text-gray-400 animate-pulse">
                            {statusMessage}
                        </div>
                    )}
                </form>

                {roleMode === 'STAFF' && (
                    <div className="mt-4 text-center">
                        <button 
                            onClick={() => setView('REGISTER')}
                            className="text-indigo-600 font-bold text-xs hover:underline py-2 transition-colors"
                        >
                            إنشاء حساب جديد
                        </button>
                    </div>
                )}
                
                {/* Minimal Footer */}
                <div className="mt-6 flex justify-center items-center gap-4 border-t border-dashed border-gray-100 pt-4 opacity-50 hover:opacity-100 transition-opacity">
                    <span className={`text-[10px] flex items-center gap-1 ${isSupabaseConfigured() ? 'text-green-600' : 'text-gray-400'}`}>
                        <CloudLightning size={10}/> {isSupabaseConfigured() ? 'Cloud' : 'Local'}
                    </span>
                    <button onClick={handleReset} className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-1">
                        <Trash2 size={10}/> Reset
                    </button>
                </div>
            </div>
        </div>
        
        <p className="mt-4 text-gray-300 text-[10px] text-center">Smart School System v2.0</p>
      </div>
    </div>
  );
};

export default Login;
