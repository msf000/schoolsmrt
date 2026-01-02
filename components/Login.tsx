
import React, { useState } from 'react';
import { authenticateUser, authenticateStudent } from '../services/storageService';
import { Lock, ArrowRight, Loader2, GraduationCap, Eye, EyeOff, User, ShieldCheck, Globe, Info, Sparkles, Zap, ChevronLeft } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
        const user = roleMode === 'STUDENT' 
            ? await authenticateStudent(identifier.trim(), password)
            : await authenticateUser(identifier.trim(), password);

        if (user) onLoginSuccess(user, true);
        else setError('بيانات الدخول غير مطابقة للسجلات السحابية.');
    } catch (e) { setError('تعذر الاتصال بخادم المنظومة، تأكد من الإنترنت.'); }
    finally { setLoading(false); }
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;
  if (view === 'PARENT_REGISTER') return <ParentRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-tajawal relative overflow-hidden" dir="rtl">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>

      <div className="w-full max-w-md bg-white rounded-5xl shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-zoom-in relative z-10 border border-white/10">
            <div className="p-10 pb-6 text-center bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none rotate-12"><Zap size={200}/></div>
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border-2 border-white/20 animate-float">
                    <ShieldCheck size={44} className="text-white" />
                </div>
                <h1 className="text-2xl font-black tracking-tight">بوابة المتابع الذكي</h1>
                <p className="text-indigo-400 text-[9px] mt-2 uppercase tracking-[0.4em] font-black">Unified Academic Gateway 2.5</p>
            </div>

            <div className="p-8 lg:p-10 pt-8">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10 border shadow-inner">
                    <TabBtn label="معلم" active={roleMode === 'STAFF'} onClick={() => setRoleMode('STAFF')} />
                    <TabBtn label="طالب" active={roleMode === 'STUDENT'} onClick={() => setRoleMode('STUDENT')} />
                    <TabBtn label="أسرة" active={roleMode === 'PARENT'} onClick={() => setRoleMode('PARENT')} />
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1 tracking-widest group-focus-within:text-indigo-600 transition-colors">معرف الدخول الموحد</label>
                        <div className="relative">
                            <User size={18} className="absolute right-4 top-3.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors"/>
                            <input type="text" required className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-black text-sm outline-none transition-all shadow-sm" placeholder="الهوية أو البريد..." value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1 tracking-widest group-focus-within:text-indigo-600 transition-colors">كلمة المرور الشخصية</label>
                        <div className="relative">
                            <Lock size={18} className="absolute right-4 top-3.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors"/>
                            <input type={showPassword ? 'text' : 'password'} required className="w-full pr-12 pl-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-black text-sm outline-none transition-all shadow-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-3.5 text-slate-300 hover:text-indigo-600 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-50 text-rose-600 text-xs font-black p-4 rounded-2xl border border-rose-100 flex items-center gap-3 animate-shake">
                            <Info size={18}/> {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-4 lg:py-5 rounded-2xl transition-all shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 text-base active:scale-[0.97] group">
                        {loading ? <Loader2 size={24} className="animate-spin" /> : <>دخول آمن للمنظومة <ArrowRight size={20} className="group-hover:translate-x-[-4px] transition-transform"/></>}
                    </button>
                </form>

                <div className="mt-12 flex flex-col gap-4 border-t border-slate-50 pt-8">
                    {roleMode === 'STAFF' && (
                        <button onClick={() => setView('REGISTER')} className="text-indigo-600 text-xs font-black hover:text-indigo-800 flex items-center justify-center gap-2 group transition-all">
                            <span>تسجيل حساب معلم جديد (سحابي)</span>
                            <ChevronLeft size={16} className="group-hover:translate-x-[-4px] transition-transform"/>
                        </button>
                    )}
                    {roleMode === 'PARENT' && (
                        <button onClick={() => setView('PARENT_REGISTER')} className="text-indigo-600 text-xs font-black hover:text-indigo-800 flex items-center justify-center gap-2 group transition-all">
                            <span>تفعيل حساب ولي أمر لأول مرة</span>
                            <ChevronLeft size={16} className="group-hover:translate-x-[-4px] transition-transform"/>
                        </button>
                    )}
                </div>
            </div>
            <div className="p-4 bg-slate-50 text-center">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Globe size={10}/> جميع الحقوق محفوظة لشركة حلول المستقبل التعليمية © 2025
                 </p>
            </div>
      </div>
      
      <p className="mt-8 text-[11px] text-slate-500 font-bold max-w-sm text-center leading-relaxed opacity-60">
        بمجرد الدخول، أنت توافق على شروط الاستخدام المعتمدة وسياسة تشفير البيانات السحابية.
      </p>
    </div>
  );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-500 ${active ? 'bg-white text-indigo-600 shadow-xl border border-slate-100 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
);

export default Login;
