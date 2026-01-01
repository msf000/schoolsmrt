
import React, { useState } from 'react';
import { authenticateUser, authenticateStudent } from '../services/storageService';
import { Lock, ArrowRight, Loader2, GraduationCap, Eye, EyeOff, User, ShieldCheck } from 'lucide-react';
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
        else setError('بيانات الدخول غير صحيحة.');
    } catch (e) { setError('تعذر الاتصال بالسحابة.'); }
    finally { setLoading(false); }
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;
  if (view === 'PARENT_REGISTER') return <ParentRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-tajawal" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-8 pb-4 text-center bg-blue-700 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                    <GraduationCap size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">نظام المتابعة الأكاديمية</h1>
                <p className="text-blue-100 text-xs mt-2 uppercase tracking-widest font-medium">Academic Management System</p>
            </div>

            <div className="p-8">
                <div className="flex bg-slate-100 p-1 rounded-lg mb-6 border">
                    <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${roleMode === 'STAFF' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>المعلمين</button>
                    <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${roleMode === 'STUDENT' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>الطلاب</button>
                    <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${roleMode === 'PARENT' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>الأهالي</button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 mr-1 tracking-wider">بيانات الدخول</label>
                        <div className="relative">
                            <User size={18} className="absolute right-3 top-3 text-slate-300"/>
                            <input type="text" required className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-sm font-medium transition-all" placeholder="الهوية أو البريد..." value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 mr-1 tracking-wider">كلمة المرور</label>
                        <div className="relative">
                            <Lock size={18} className="absolute right-3 top-3 text-slate-300"/>
                            <input type={showPassword ? 'text' : 'password'} required className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-sm font-medium transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-slate-300 hover:text-blue-600 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-lg border border-red-100 flex items-center gap-2">
                            <ShieldCheck size={14}/> {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول آمن للمنظومة <ArrowRight size={18}/></>}
                    </button>
                </form>

                <div className="mt-8 flex flex-col gap-3">
                    {roleMode === 'STAFF' && (
                        <button onClick={() => setView('REGISTER')} className="text-blue-600 text-xs font-bold hover:underline">تسجيل معلم جديد</button>
                    )}
                    {roleMode === 'PARENT' && (
                        <button onClick={() => setView('PARENT_REGISTER')} className="text-blue-600 text-xs font-bold hover:underline">ربط حساب الأبناء</button>
                    )}
                </div>
            </div>
            <div className="p-4 bg-slate-50 border-t text-center">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">جميع الحقوق محفوظة © 2025</p>
            </div>
      </div>
    </div>
  );
};

export default Login;
