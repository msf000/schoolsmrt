
import React, { useState, useEffect } from 'react';
import { authenticateUser, getStudents, setSystemMode, clearDatabase, authenticateStudent, initAutoSync, checkConnection } from '../services/storageService';
import { updateSupabaseConfig } from '../services/supabaseClient';
import { Lock, ArrowRight, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, User, CheckSquare, Square, Users, Settings, AlertCircle, UserPlus, CloudLightning, Trash2, Baby, Phone, Database, Wifi, Save, RefreshCw } from 'lucide-react';
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

  // Config Modal State
  const [showConfig, setShowConfig] = useState(false);
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CHECKING' | 'SUCCESS' | 'ERROR'>('IDLE');

  useEffect(() => {
      // Load existing config if available
      setSupaUrl(localStorage.getItem('custom_supabase_url') || '');
      setSupaKey(localStorage.getItem('custom_supabase_key') || '');
  }, []);

  const handleTestConnection = async () => {
      setConnectionStatus('CHECKING');
      const success = updateSupabaseConfig(supaUrl, supaKey);
      if (!success) {
          setConnectionStatus('ERROR');
          return;
      }
      const res = await checkConnection();
      setConnectionStatus(res.success ? 'SUCCESS' : 'ERROR');
  };

  const handleSaveConfig = () => {
      if (!supaUrl || !supaKey) return;
      updateSupabaseConfig(supaUrl, supaKey);
      window.location.reload(); // Reload to apply new client
  };

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
    setStatusMessage('جاري التحقق من البيانات...');
    setSystemMode(true); // Default to Online mode for Cloud login

    try {
        const cleanIdentifier = identifier.trim();

        // 1. Parent Login Logic (Needs local students synced or cloud fetch)
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
                setError('رقم الجوال غير مسجل كولي أمر لأي طالب (تأكد من المزامنة).');
                setLoading(false);
                return;
            }
        }

        // 2. Student Login Logic (Specific function)
        if (roleMode === 'STUDENT') {
            const studentUser = await authenticateStudent(cleanIdentifier, password);
            if (studentUser) {
                onLoginSuccess(studentUser, rememberMe);
                setLoading(false);
                return;
            } else {
                setError('بيانات الطالب غير صحيحة (تأكد من رقم الهوية وآخر 4 أرقام).');
                setLoading(false);
                return;
            }
        }

        // 3. Staff Logic (Cloud Auth)
        // roleMode here is effectively 'STAFF'
        const user = await authenticateUser(cleanIdentifier, password);
        
        if (user) {
            if (user.role === 'STUDENT') {
                setError('هذا الحساب مخصص للطلاب. الرجاء الدخول من تبويب الطالب.');
                setLoading(false);
            } else {
                // Ensure data sync before proceeding
                setStatusMessage('جاري استرجاع بياناتك من السحابة...');
                await initAutoSync();
                onLoginSuccess(user, rememberMe);
                setLoading(false);
            }
        } else {
            setError('البيانات المدخلة غير صحيحة أو خطأ في الاتصال بالسحابة.');
            setLoading(false);
        }
    } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء تسجيل الدخول.');
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
      
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in relative">
            
            {/* Config Button */}
            <button 
                onClick={() => setShowConfig(true)}
                className="absolute top-4 left-4 z-20 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                title="إعدادات الاتصال"
            >
                <Settings size={20}/>
            </button>

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
                        {roleMode === 'PARENT' ? 'أدخل رقم الجوال المسجل في النظام' : 
                         roleMode === 'STUDENT' ? 'أدخل رقم الهوية للدخول' : 
                         'أدخل بياناتك للدخول إلى النظام'}
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                            {roleMode === 'PARENT' ? 'رقم الجوال' : roleMode === 'STUDENT' ? 'رقم الهوية / السجل' : 'البريد الإلكتروني / الهوية'}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                {roleMode === 'PARENT' ? <Phone size={18} className="text-gray-400"/> : <User size={18} className="text-gray-400" />}
                            </div>
                            <input 
                                type={roleMode === 'PARENT' ? "tel" : "text"}
                                required
                                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dir-ltr text-right"
                                placeholder={roleMode === 'PARENT' ? "05xxxxxxxx" : roleMode === 'STUDENT' ? "10xxxxxxxx" : "user@email.com"}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                    </div>

                    {roleMode !== 'PARENT' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                {roleMode === 'STUDENT' ? 'كلمة المرور' : 'كلمة المرور'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-gray-400" />
                                </div>
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dir-ltr text-right"
                                    placeholder={roleMode === 'STUDENT' ? "كلمة المرور أو آخر 4 أرقام من الهوية" : "••••••••"}
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
                            {roleMode === 'STUDENT' && <p className="text-[10px] text-gray-400 mt-1 mr-1">* كلمة المرور الافتراضية هي آخر 4 أرقام من الهوية</p>}
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
                            <button type="button" onClick={() => setShowConfig(true)} className="mr-auto text-xs underline hover:text-red-800">إصلاح الاتصال؟</button>
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
                    
                    {loading && statusMessage && (
                        <div className="text-center text-xs text-gray-500 animate-pulse">
                            {statusMessage}
                        </div>
                    )}
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

      {/* Database Configuration Modal */}
      {showConfig && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Database size={20} className="text-primary"/> إعدادات الاتصال بالسحابة</h3>
                      <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600"><ShieldCheck size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${connectionStatus === 'SUCCESS' ? 'bg-green-50 text-green-700 border-green-200' : connectionStatus === 'ERROR' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600'}`}>
                          {connectionStatus === 'CHECKING' && <RefreshCw size={16} className="animate-spin"/>}
                          {connectionStatus === 'SUCCESS' && <Wifi size={16}/>}
                          {connectionStatus === 'ERROR' && <AlertCircle size={16}/>}
                          <span>
                              {connectionStatus === 'IDLE' ? 'أدخل البيانات ثم اضغط فحص الاتصال' :
                               connectionStatus === 'CHECKING' ? 'جاري محاولة الاتصال...' :
                               connectionStatus === 'SUCCESS' ? 'تم الاتصال بنجاح! يمكنك الحفظ.' :
                               'فشل الاتصال. تحقق من الرابط والمفتاح.'}
                          </span>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">رابط المشروع (Supabase URL)</label>
                          <input 
                              type="text" 
                              className="w-full p-2 border rounded-lg dir-ltr font-mono text-xs" 
                              placeholder="https://xyz.supabase.co"
                              value={supaUrl}
                              onChange={e => setSupaUrl(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">مفتاح API (Anon Key)</label>
                          <input 
                              type="password" 
                              className="w-full p-2 border rounded-lg dir-ltr font-mono text-xs" 
                              placeholder="eyJh..."
                              value={supaKey}
                              onChange={e => setSupaKey(e.target.value)}
                          />
                      </div>

                      <div className="flex gap-3 pt-4">
                          <button onClick={handleTestConnection} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">فحص الاتصال</button>
                          <button onClick={handleSaveConfig} disabled={connectionStatus !== 'SUCCESS'} className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2">
                              <Save size={16}/> حفظ وإعادة تشغيل
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
