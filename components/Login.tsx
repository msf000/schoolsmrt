
import React, { useState } from 'react';
import { authenticateUser, authenticateStudent } from '../services/storageService';
import { Lock, ArrowRight, Loader2, GraduationCap, Eye, EyeOff, User, Cloud, ShieldCheck, Sparkles } from 'lucide-react';
import TeacherRegistration from './TeacherRegistration';
import ParentRegistration from './ParentRegistration';

interface LoginProps {
  onLoginSuccess: (user: any, rememberMe: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'PARENT_REGISTER'>('LOGIN'); 
  const [roleMode, setRoleMode] = useState<'STAFF' | 'STUDENT' | 'PARENT'>('STAFF');
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const cleanIdentifier = identifier.trim();
        
        if (roleMode === 'PARENT') {
            const user = await authenticateUser(cleanIdentifier, password);
            if (user && user.role === 'PARENT') {
                onLoginSuccess(user, rememberMe);
                return;
            } else { setError('بيانات دخول ولي الأمر غير صحيحة.'); setLoading(false); return; }
        }

        if (roleMode === 'STUDENT') {
            const studentUser = await authenticateStudent(cleanIdentifier, password);
            if (studentUser) {
                onLoginSuccess({ ...studentUser, role: 'STUDENT' }, rememberMe);
                return;
            } else { setError('بيانات الدخول غير صحيحة.'); setLoading(false); return; }
        }

        const user = await authenticateUser(cleanIdentifier, password);
        if (user) {
            onLoginSuccess(user, rememberMe);
        } else {
            setError('بيانات الدخول غير صحيحة. يرجى التأكد من حسابك.');
            setLoading(false);
        }
    } catch (e: any) {
        setError('تعذر الاتصال بالسحابة. يرجى التحقق من الإنترنت.');
        setLoading(false);
    }
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;
  if (view === 'PARENT_REGISTER') return <ParentRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 font-tajawal relative overflow-hidden" dir="rtl">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full blur-[120px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full blur-[120px] opacity-60"></div>
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] border border-white/50 overflow-hidden animate-slide-up relative z-10">
            <div className="p-10 pb-4 text-center">
                <div className="relative inline-block mb-6">
                    <div className="absolute -inset-2 bg-indigo-500 rounded-[2rem] blur-xl opacity-20 animate-pulse"></div>
                    <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl relative">
                        <GraduationCap size={44} className="text-white" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">المتابع الذكي</h1>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Elite School OS</p>
            </div>

            <div className="px-10 pb-10">
                <div className="flex bg-slate-100/50 p-1.5 rounded-[1.5rem] mb-8 border border-slate-200/50">
                    <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 ${roleMode === 'STAFF' ? 'bg-white text-indigo-700 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>المعلمين</button>
                    <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 ${roleMode === 'STUDENT' ? 'bg-white text-indigo-700 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>الطلاب</button>
                    <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 ${roleMode === 'PARENT' ? 'bg-white text-indigo-700 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>الأهالي</button>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">بيانات الدخول</label>
                        <div className="relative group">
                            <User size={20} className="absolute right-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors"/>
                            <input type="text" required className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-transparent rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-100 font-bold outline-none transition-all" placeholder="الهوية أو البريد..." value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="relative group">
                            <Lock size={20} className="absolute right-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors"/>
                            <input type={showPassword ? 'text' : 'password'} required className="w-full pr-12 pl-12 py-4 bg-slate-50 border border-transparent rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-100 font-bold outline-none transition-all" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-4 text-slate-300 hover:text-indigo-600 transition-colors">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-[11px] font-black p-4 rounded-2xl border border-red-100 text-center animate-shake">
                            <ShieldCheck size={16} className="inline mr-2"/> {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] transition-all shadow-2xl shadow-indigo-200 hover:bg-black hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                        {loading ? <Loader2 size={24} className="animate-spin" /> : <>دخول آمن للمنظومة <ArrowRight size={22}/></>}
                    </button>
                </form>

                <div className="mt-8 flex flex-col gap-3">
                    {roleMode === 'STAFF' && (
                        <button onClick={() => setView('REGISTER')} className="w-full py-4 rounded-2xl border-2 border-slate-50 text-indigo-600 font-black text-xs hover:bg-indigo-50 hover:border-indigo-100 transition-all flex items-center justify-center gap-2">
                            <Sparkles size={16}/> تسجيل معلم جديد
                        </button>
                    )}
                    {roleMode === 'PARENT' && (
                        <button onClick={() => setView('PARENT_REGISTER')} className="w-full py-4 rounded-2xl border-2 border-slate-50 text-indigo-600 font-black text-xs hover:bg-indigo-50 hover:border-indigo-100 transition-all flex items-center justify-center gap-2">
                            <User size={16}/> ربط حساب الأبناء
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-slate-50/50 p-5 flex items-center justify-center gap-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                    <Cloud size={14} className="text-emerald-500"/>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Connected to Cloud Database</span>
                </div>
            </div>
      </div>
    </div>
  );
};

export default Login;
