
import React, { useState, useEffect } from 'react';
import { authenticateUser, getStudents, setSystemMode, clearDatabase, authenticateStudent, initAutoSync, downloadFromSupabase } from '../services/storageService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, AlertCircle, UserPlus, CloudLightning, Trash2, Baby, Phone, RefreshCw, Sparkles } from 'lucide-react';
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
  
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
      const autoSync = async () => {
          if (isSupabaseConfigured()) {
              setIsSyncing(true);
              setStatusMessage('جاري الاتصال بالسحابة...');
              try {
                  await initAutoSync();
              } catch (e) {
                  console.error("Auto sync failed", e);
              } finally {
                  setIsSyncing(false);
                  setStatusMessage('');
              }
          }
      };
      autoSync();
  }, []);

  const handleRegisterSuccess = (email: string, pass: string) => {
      setRoleMode('STAFF');
      setIdentifier(email);
      setPassword(pass);
      setView('LOGIN');
      setTimeout(() => {
          document.getElementById('login-btn')?.click();
      }, 500);
  };

  const handleManualSync = async () => {
      if (!isSupabaseConfigured()) return;
      setIsSyncing(true);
      setStatusMessage('جاري سحب أحدث البيانات...');
      try {
          await downloadFromSupabase();
          window.location.reload();
      } catch (e) {
          setError('فشل الاتصال بالسحابة');
      } finally {
          setIsSyncing(false);
          setStatusMessage('');
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatusMessage('جاري التحقق...');
    setSystemMode(true); 

    try {
        const cleanIdentifier = identifier.trim();

        if (roleMode === 'PARENT') {
            if (isSupabaseConfigured() && getStudents().length === 0) {
                 await initAutoSync();
            }
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
                setError('رقم الجوال غير مسجل.');
                setLoading(false);
                return;
            }
        }

        if (roleMode === 'STUDENT') {
            const studentUser = await authenticateStudent(cleanIdentifier, password);
            if (studentUser) {
                setStatusMessage('تحميل ملف الطالب...');
                if (isSupabaseConfigured()) await initAutoSync();
                // نضمن وجود خاصية role لتمييز الطالب في نظام المسارات
                onLoginSuccess({ ...studentUser, role: 'STUDENT' }, rememberMe);
                setLoading(false);
                return;
            } else {
                setError('بيانات الطالب غير صحيحة.');
                setLoading(false);
                return;
            }
        }

        const user = await authenticateUser(cleanIdentifier, password);
        
        if (user) {
            if (user.role === 'STUDENT') {
                setError('يرجى الدخول من تبويب الطالب.');
                setLoading(false);
            } else {
                setStatusMessage('تجهيز المكتب...');
                if (isSupabaseConfigured()) {
                    await initAutoSync(); 
                }
                onLoginSuccess(user, rememberMe);
                setLoading(false);
            }
        } else {
            setError('بيانات الدخول غير صحيحة.');
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
          window.location.reload();
      }
  };

  if (view === 'REGISTER') {
      return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={handleRegisterSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden z-[50]" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-600 to-purple-700 transform -skew-y-6 origin-top-left -z-10 shadow-lg"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-slide-up relative">
            
            {/* Header */}
            <div className="bg-white p-8 text-center relative pt-10">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 transform rotate-3">
                    <GraduationCap size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-tight">نظام المدرس الذكي</h1>
                <p className="text-gray-500 text-sm font-medium flex justify-center items-center gap-1">
                    <Sparkles size={12} className="text-yellow-500"/> الإدارة المدرسية الحديثة
                </p>
            </div>

            {/* Role Switcher */}
            <div className="flex bg-gray-50 p-2 mx-6 rounded-xl border border-gray-200">
                <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${roleMode === 'STAFF' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}>
                    <User size={16}/> المعلمين
                </button>
                <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${roleMode === 'STUDENT' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}>
                    <Users size={16}/> الطلاب
                </button>
                <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${roleMode === 'PARENT' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}>
                    <Baby size={16}/> ولي الأمر
                </button>
            </div>

            {/* Form */}
            <div className="p-6 md:p-8 pt-4">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-800 text-center">
                        {roleMode === 'STAFF' ? 'تسجيل دخول الكادر التعليمي' : roleMode === 'STUDENT' ? 'بوابة الطالب الإلكترونية' : 'متابعة ولي الأمر'}
                    </h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 mr-1">
                            {roleMode === 'PARENT' ? 'رقم الجوال' : roleMode === 'STUDENT' ? 'رقم الهوية / السجل' : 'البريد أو الهوية'}
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                {roleMode === 'PARENT' ? <Phone size={18} className="text-gray-400"/> : <User size={18} className="text-gray-400"/>}
                            </div>
                            <input 
                                type={roleMode === 'PARENT' ? "tel" : "text"}
                                required
                                className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dir-ltr text-right text-sm font-bold text-gray-800"
                                placeholder={roleMode === 'PARENT' ? "05xxxxxxxx" : roleMode === 'STUDENT' ? "10xxxxxxxx" : "user@email.com"}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                    </div>

                    {roleMode !== 'PARENT' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 mr-1">كلمة المرور</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-gray-400"/>
                                </div>
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pr-10 pl-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dir-ltr text-right text-sm font-bold text-gray-800"
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
                        disabled={loading || isSyncing}
                        className={`w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group ${
                            roleMode === 'STUDENT' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' :
                            roleMode === 'PARENT' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' :
                            'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                    >
                        {loading || isSyncing ? <Loader2 size={20} className="animate-spin" /> : <>دخول <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform"/></>}
                    </button>
                    
                    {(loading || isSyncing) && statusMessage && (
                        <div className="text-center text-[10px] text-gray-400 animate-pulse font-medium">
                            {statusMessage}
                        </div>
                    )}
                </form>

                {roleMode === 'STAFF' && (
                    <div className="mt-6 text-center border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400 mb-2">ليس لديك حساب؟</p>
                        <button 
                            onClick={() => setView('REGISTER')}
                            className="text-indigo-600 font-bold text-sm hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                            <UserPlus size={16}/> إنشاء حساب معلم جديد
                        </button>
                    </div>
                )}
                
                {/* Footer with Sync & Reset */}
                <div className="mt-4 flex flex-wrap justify-center items-center gap-4 pt-2 opacity-80 hover:opacity-100 transition-opacity">
                    <span className={`text-[10px] flex items-center gap-1 font-mono ${isSupabaseConfigured() ? 'text-green-600' : 'text-gray-400'}`}>
                        <CloudLightning size={10}/> {isSupabaseConfigured() ? 'Cloud Active' : 'Local Mode'}
                    </span>
                    
                    {isSupabaseConfigured() && (
                        <button 
                            onClick={handleManualSync} 
                            disabled={isSyncing}
                            className="text-[10px] hover:bg-gray-100 text-indigo-600 px-2 py-1 rounded border border-transparent hover:border-gray-200 flex items-center gap-1 transition-colors"
                        >
                            <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''}/>
                            {isSyncing ? 'M' : 'Sync'}
                        </button>
                    )}

                    <button onClick={handleReset} className="text-[10px] text-red-400 hover:text-red-500 flex items-center gap-1 hover:underline">
                        <Trash2 size={10}/> Reset App
                    </button>
                </div>
            </div>
        </div>
        
        <p className="mt-8 text-indigo-200 text-xs font-medium text-center relative z-10">Smart School System v2.1 &copy; 2024</p>
      </div>
    </div>
  );
};

export default Login;
