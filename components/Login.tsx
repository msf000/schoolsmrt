
import React, { useState } from 'react';
import { authenticateUser, authenticateStudent } from '../services/storageService';
import { Lock, ArrowRight, Loader2, GraduationCap, Eye, EyeOff, User, Phone, Cloud } from 'lucide-react';
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const cleanIdentifier = identifier.trim();
        
        if (roleMode === 'PARENT') {
            setError('خدمة دخول أولياء الأمور تتطلب رقم جوال مسجل مسبقاً في السحابة.');
            setLoading(false);
            return;
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
            setError('بيانات الدخول غير صحيحة. يرجى التأكد من حسابك في السحابة.');
            setLoading(false);
        }
    } catch (e: any) {
        setError('تعذر الاتصال بالسحابة. يرجى التحقق من الإنترنت.');
        setLoading(false);
    }
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-tajawal" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
            <div className="p-8 pb-4 text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
                    <GraduationCap size={36} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-gray-900">المتابع الذكي</h1>
                <p className="text-gray-400 text-xs font-bold uppercase mt-1">منظومة الربط السحابي</p>
            </div>

            <div className="px-8 pb-8">
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                    <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${roleMode === 'STAFF' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400'}`}>المعلمين</button>
                    <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${roleMode === 'STUDENT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400'}`}>الطلاب</button>
                    <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${roleMode === 'PARENT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400'}`}>الأهالي</button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 mr-1">المعرف (الهوية أو البريد)</label>
                        <div className="relative">
                            <User size={18} className="absolute right-3 top-3 text-slate-300"/>
                            <input type="text" required className="w-full pr-10 pl-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="أدخل بياناتك هنا..." value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 mr-1">كلمة المرور</label>
                        <div className="relative">
                            <Lock size={18} className="absolute right-3 top-3 text-slate-300"/>
                            <input type={showPassword ? 'text' : 'password'} required className="w-full pr-10 pl-10 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-slate-300 hover:text-indigo-600">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-xl border border-red-100 text-center">{error}</div>}

                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>دخول آمن <ArrowRight size={18}/></>}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    {roleMode === 'STAFF' && <button onClick={() => setView('REGISTER')} className="text-indigo-600 font-black text-xs hover:underline">ليس لديك حساب؟ سجل كمعلم جديد</button>}
                </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-2">
                <Cloud size={14} className="text-green-500"/>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">متصل بالسحابة الموحدة</span>
            </div>
      </div>
    </div>
  );
};

export default Login;
