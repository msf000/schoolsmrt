
import React, { useState, useEffect } from 'react';
import { authenticateUser, getStudents, setSystemMode, clearDatabase, authenticateStudent, initAutoSync, downloadFromSupabase } from '../services/storageService';
import { isSupabaseConfigured, updateSupabaseConfig } from '../services/supabaseClient';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, Sparkles, Phone, RefreshCw, CloudLightning, Baby, Settings, Server, Save, X } from 'lucide-react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Cloud Config State
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('custom_supabase_url') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('custom_supabase_key') || '');

  useEffect(() => {
      const autoSync = async () => {
          if (isSupabaseConfigured()) {
              setIsSyncing(true);
              try { await initAutoSync(); } catch (e) {} finally { setIsSyncing(false); }
          }
      };
      autoSync();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSystemMode(true); 

    try {
        const cleanIdentifier = identifier.trim();
        if (roleMode === 'PARENT') {
            const allStudents = getStudents();
            const children = allStudents.filter(s => s.parentPhone === cleanIdentifier || s.parentPhone?.replace(/\s/g, '') === cleanIdentifier);
            if (children.length > 0) {
                onLoginSuccess({ id: `p_${cleanIdentifier}`, name: children[0].parentName || 'ولي أمر', role: 'PARENT', phone: cleanIdentifier }, rememberMe);
                return;
            } else { setError('رقم الجوال غير مسجل.'); setLoading(false); return; }
        }

        if (roleMode === 'STUDENT') {
            const studentUser = await authenticateStudent(cleanIdentifier, password);
            if (studentUser) {
                onLoginSuccess({ ...studentUser, role: 'STUDENT' }, rememberMe);
                return;
            } else { setError('بيانات الطالب غير صحيحة.'); setLoading(false); return; }
        }

        const user = await authenticateUser(cleanIdentifier, password);
        if (user) {
            onLoginSuccess(user, rememberMe);
        } else {
            setError('بيانات الدخول غير صحيحة.');
            setLoading(false);
        }
    } catch (e: any) {
        setError('خطأ: ' + e.message);
        setLoading(false);
    }
  };

  const handleSaveConfig = () => {
      if (!dbUrl || !dbKey) return alert('يرجى إكمال البيانات');
      updateSupabaseConfig(dbUrl, dbKey);
      setIsConfigModalOpen(false);
      alert('تم تحديث إعدادات السحابة بنجاح!');
      window.location.reload();
  };

  if (view === 'REGISTER') return <TeacherRegistration onBack={() => setView('LOGIN')} onRegisterSuccess={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex items-center justify-center p-0 md:p-4 overflow-hidden relative" dir="rtl">
      {/* Settings Gear for Cloud Config */}
      <button 
        onClick={() => setIsConfigModalOpen(true)}
        className="fixed top-6 left-6 p-3 bg-white rounded-full shadow-lg border border-gray-100 text-gray-400 hover:text-indigo-600 transition-all z-50 group"
        title="إعدادات السحابة"
      >
        <Server size={24}/>
        {!isSupabaseConfigured() && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
      </button>

      <div className="hidden md:block absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-700 to-indigo-900 -skew-y-6 origin-top-left -z-10 shadow-2xl"></div>
      
      <div className="w-full max-w-md h-full md:h-auto flex flex-col justify-center animate-slide-up px-6 py-10">
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200">
                    <GraduationCap size={44} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">المتابع الذكي</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">منصة الإدارة المدرسية الموحدة</p>
            </div>

            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
                <button onClick={() => setRoleMode('STAFF')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${roleMode === 'STAFF' ? 'bg-white text-indigo-700 shadow-xl' : 'text-gray-400'}`}>المعلمين</button>
                <button onClick={() => setRoleMode('STUDENT')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${roleMode === 'STUDENT' ? 'bg-white text-indigo-700 shadow-xl' : 'text-gray-400'}`}>الطلاب</button>
                <button onClick={() => setRoleMode('PARENT')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${roleMode === 'PARENT' ? 'bg-white text-indigo-700 shadow-xl' : 'text-gray-400'}`}>أولياء الأمور</button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase mr-1">
                        {roleMode === 'PARENT' ? 'رقم الجوال' : roleMode === 'STUDENT' ? 'رقم الهوية' : 'البريد أو الهوية'}
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                            {roleMode === 'PARENT' ? <Phone size={20}/> : <User size={20}/>}
                        </div>
                        <input type="text" required className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-800" placeholder={roleMode === 'PARENT' ? "05xxxxxxxx" : "أدخل البيانات هنا..."} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                    </div>
                </div>

                {roleMode !== 'PARENT' && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase mr-1">كلمة المرور</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-indigo-600">
                                <Lock size={20}/>
                            </div>
                            <input type={showPassword ? 'text' : 'password'} required className="w-full pr-12 pl-12 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-800" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-indigo-600">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="bg-red-50 text-red-600 text-[10px] font-black p-4 rounded-2xl border border-red-100 animate-pulse">{error}</div>}

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <Loader2 size={24} className="animate-spin" /> : <>دخول النظام <ArrowRight size={20}/></>}
                </button>
            </form>

            <div className="mt-8 text-center space-y-4">
                {roleMode === 'STAFF' && <button onClick={() => setView('REGISTER')} className="text-indigo-600 font-black text-xs hover:underline flex items-center justify-center gap-2 mx-auto bg-indigo-50 px-4 py-2 rounded-xl transition-colors">ليس لديك حساب؟ سجل الآن</button>}
                <div className="flex justify-center gap-4 text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><CloudLightning size={10}/> Cloud Encrypted</span>
                    <span>&copy; 2025 Smart System</span>
                </div>
            </div>
      </div>

      {/* Cloud Configuration Modal */}
      {isConfigModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in border border-white/20">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Server/></div>
                          <h3 className="text-xl font-black text-gray-800">إعداد السحابة</h3>
                      </div>
                      <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <p className="text-xs text-gray-500 leading-relaxed font-bold">أدخل بيانات الربط الخاصة بـ Supabase لمزامنة هذا الجهاز مع حسابك.</p>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 mr-1">Supabase URL</label>
                          <input className="w-full p-4 bg-gray-50 border-none rounded-2xl font-mono text-xs dir-ltr focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://xyz.supabase.co" value={dbUrl} onChange={e=>setDbUrl(e.target.value)}/>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 mr-1">Anon API Key</label>
                          <input className="w-full p-4 bg-gray-50 border-none rounded-2xl font-mono text-xs dir-ltr focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="eyJhbGci..." value={dbKey} onChange={e=>setDbKey(e.target.value)}/>
                      </div>
                      <button onClick={handleSaveConfig} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                          <Save size={18}/> حفظ البيانات والربط
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
