
import React, { useState } from 'react';
import { authenticateUser, authenticateStudent } from '../services/storageService';
import { Lock, ArrowRight, Loader2, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import TeacherRegistration from './TeacherRegistration';
import ParentRegistration from './ParentRegistration';

interface LoginProps {
  onLoginSuccess: (user: any, rememberMe: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [roleMode, setRoleMode] = useState<'STAFF' | 'STUDENT' | 'PARENT'>('STAFF');
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'PARENT_REGISTER'>('LOGIN');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
        const user = roleMode === 'STUDENT' 
            ? await authenticateStudent(identifier.trim(), password)
            : await authenticateUser(identifier.trim(), password);

        if (user) onLoginSuccess(user, true);
        else setError('بيانات الدخول غير صحيحة');
    } catch (e) { setError('حدث خطأ في الاتصال بالخادم'); }
    finally { setLoading(false); }
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;
  if (view === 'PARENT_REGISTER') return <ParentRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-tajawal">
      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-brand-500/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">تسجيل الدخول</h1>
          <p className="text-slate-500 mt-2 text-sm">مرحباً بك في المنظومة التعليمية الموحدة</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex bg-slate-50 p-1 rounded-xl mb-8 border border-slate-100">
            <TabBtn label="معلم" active={roleMode === 'STAFF'} onClick={() => setRoleMode('STAFF')} />
            <TabBtn label="طالب" active={roleMode === 'STUDENT'} onClick={() => setRoleMode('STUDENT')} />
            <TabBtn label="ولي أمر" active={roleMode === 'PARENT'} onClick={() => setRoleMode('PARENT')} />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">معرف الدخول</label>
              <div className="relative">
                <User size={18} className="absolute right-3.5 top-3 text-slate-300"/>
                <input type="text" required className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 rounded-xl text-sm outline-none transition-all" placeholder="رقم الهوية أو البريد" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3.5 top-3 text-slate-300"/>
                <input type={showPassword ? 'text' : 'password'} required className="w-full pr-11 pl-12 py-3 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 rounded-xl text-sm outline-none transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3.5 top-3 text-slate-300 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}

            <button type="submit" disabled={loading} className="w-full bg-brand-500 text-white font-bold py-3.5 rounded-xl hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول <ArrowRight size={18}/></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col gap-3">
             <button onClick={() => setView('REGISTER')} className="text-brand-500 text-xs font-bold hover:underline">إنشاء حساب معلم جديد</button>
             <button onClick={() => setView('PARENT_REGISTER')} className="text-slate-400 text-xs font-bold hover:underline">تفعيل حساب ولي أمر</button>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">Powered by Smart Cloud Analytics</p>
      </div>
    </div>
  );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${active ? 'bg-white text-brand-500 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
);

export default Login;
