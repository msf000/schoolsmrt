
import React, { useState } from 'react';
import { authenticateUser, authenticateStudent } from '../services/storageService';
import { Lock, ArrowRight, Loader2, GraduationCap, Eye, EyeOff, User, ShieldCheck, Globe, Info } from 'lucide-react';
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
        else setError('بيانات الدخول غير صحيحة، يرجى التحقق وإعادة المحاولة.');
    } catch (e) { setError('تعذر الاتصال بخادم السحابة، تحقق من الإنترنت.'); }
    finally { setLoading(false); }
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;
  if (view === 'PARENT_REGISTER') return <ParentRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-tajawal relative overflow-hidden" dir="rtl">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-700"></div>
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12"><GraduationCap size={400}/></div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in relative z-10">
            <div className="p-10 pb-6 text-center border-b border-slate-50">
                <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                    <ShieldCheck size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">منصة المتابعة الأكاديمية الموحدة</h1>
                <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.3em] font-black">Unified Academic Gateway</p>
            </div>

            <div className="p-10 pt-8">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-8 border border-slate-200 shadow-inner">
                    <TabBtn label="المعلمون" active={roleMode === 'STAFF'} onClick={() => setRoleMode('STAFF')} />
                    <TabBtn label="الطلاب" active={roleMode === 'STUDENT'} onClick={() => setRoleMode('STUDENT')} />
                    <TabBtn label="أولياء الأمور" active={roleMode === 'PARENT'} onClick={() => setRoleMode('PARENT')} />
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1 tracking-widest">معرف الدخول (الهوية أو البريد)</label>
                        <div className="relative">
                            <User size={18} className="absolute right-3.5 top-3 text-slate-300"/>
                            <input type="text" required className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 outline-none text-sm font-bold transition-all shadow-sm" placeholder="أدخل بياناتك..." value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1 tracking-widest">كلمة المرور الشخصية</label>
                        <div className="relative">
                            <Lock size={18} className="absolute right-3.5 top-3 text-slate-300"/>
                            <input type={showPassword ? 'text' : 'password'} required className="w-full pr-11 pl-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 outline-none text-sm font-bold transition-all shadow-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3.5 top-3 text-slate-300 hover:text-blue-600 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-shake">
                            <Info size={16}/> {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-3 mt-4 text-sm active:scale-[0.98]">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول آمن للمنظومة <ArrowRight size={18}/></>}
                    </button>
                </form>

                <div className="mt-10 flex flex-col gap-4 border-t border-slate-50 pt-6">
                    {roleMode === 'STAFF' && (
                        <button onClick={() => setView('REGISTER')} className="text-blue-600 text-xs font-black hover:text-blue-800 flex items-center justify-center gap-2 group transition-all">
                            <span>تسجيل حساب معلم جديد</span>
                            <ArrowRight size={14} className="rotate-180 group-hover:translate-x-1 transition-transform"/>
                        </button>
                    )}
                    {roleMode === 'PARENT' && (
                        <button onClick={() => setView('PARENT_REGISTER')} className="text-blue-600 text-xs font-black hover:text-blue-800 flex items-center justify-center gap-2 group transition-all">
                            <span>ربط حساب الأبناء لأول مرة</span>
                            <ArrowRight size={14} className="rotate-180 group-hover:translate-x-1 transition-transform"/>
                        </button>
                    )}
                </div>
            </div>
            <div className="p-4 bg-slate-50 text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Globe size={10}/> جميع الحقوق محفوظة للنظام الأكاديمي السحابي © 2025
                 </p>
            </div>
      </div>
      
      <p className="mt-8 text-[10px] text-slate-400 font-bold max-w-sm text-center leading-relaxed">
        استخدامك لهذه المنصة يعني موافقتك على شروط الاستخدام وسياسة الخصوصية الأكاديمية.
      </p>
    </div>
  );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${active ? 'bg-white text-blue-700 shadow-md border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
);

export default Login;
