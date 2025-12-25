
import React, { useState, useEffect } from 'react';
import { Student, SystemUser } from '../types';
import { getStudents, addSystemUser, fetchSystemUsers } from '../services/storageService';
import { User, Phone, Lock, ArrowRight, ShieldCheck, CheckCircle, Loader2, Baby, Info } from 'lucide-react';

interface ParentRegistrationProps {
    onBack: () => void;
    onRegisterSuccess: () => void;
}

const ParentRegistration: React.FC<ParentRegistrationProps> = ({ onBack, onRegisterSuccess }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [foundChild, setFoundChild] = useState<Student | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearchChild = async () => {
        if (phone.length < 9) return setError('أدخل رقم جوال صحيح.');
        setLoading(true);
        setError('');
        
        try {
            const allStudents = getStudents();
            // Match by parent phone stored in student record
            const match = allStudents.find(s => 
                s.parentPhone === phone || 
                (s.parentPhone && s.parentPhone.includes(phone)) ||
                (phone.includes(s.parentPhone || 'NOMATCH'))
            );

            if (match) {
                setFoundChild(match);
                setStep(2);
            } else {
                setError('لم نتمكن من العثور على طالب مرتبط بهذا الرقم. يرجى التأكد من تسجيل الرقم لدى المدرسة.');
            }
        } catch (e) {
            setError('حدث خطأ في الاتصال.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (password !== confirmPass) return setError('كلمات المرور غير متطابقة.');
        setLoading(true);
        try {
            const newUser: SystemUser = {
                id: `parent_${Date.now()}`,
                name: `ولي أمر ${foundChild?.name}`,
                email: `${phone}@system.local`,
                role: 'PARENT',
                phone: phone,
                password: password,
                status: 'ACTIVE'
            };
            await addSystemUser(newUser);
            alert('تم إنشاء الحساب بنجاح! يمكنك الدخول الآن.');
            onRegisterSuccess();
        } catch (e) {
            setError('فشل إنشاء الحساب السحابي.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-4 font-tajawal" dir="rtl">
            <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
                <div className="p-10 text-center bg-indigo-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Baby size={120}/></div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <ShieldCheck size={32}/>
                    </div>
                    <h2 className="text-2xl font-black">تسجيل ولي أمر</h2>
                    <p className="text-indigo-200 text-xs mt-1">اربط حسابك بأبنائك في النظام الموحد</p>
                </div>

                <div className="p-10 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100">
                            <Info size={16}/> {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">رقم الجوال المسجل في المدرسة</label>
                                <div className="relative">
                                    <Phone className="absolute right-4 top-4 text-slate-300" size={20}/>
                                    <input 
                                        className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-lg focus:ring-2 focus:ring-indigo-500" 
                                        placeholder="05xxxxxxxx"
                                        value={phone}
                                        onChange={e=>setPhone(e.target.value)}
                                    />
                                </div>
                                <p className="mt-3 text-[10px] text-gray-400 leading-relaxed font-medium">سيقوم النظام بالبحث في قاعدة البيانات السحابية لربط حسابك تلقائياً بأبنائك.</p>
                            </div>
                            <button onClick={handleSearchChild} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="animate-spin"/> : <>تحقق من السجل <ArrowRight size={20}/></>}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black">
                                    {foundChild?.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-900 text-sm">تم العثور على: {foundChild?.name}</h4>
                                    <p className="text-[10px] text-emerald-600 font-bold">{foundChild?.className}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">كلمة المرور الجديدة</label>
                                    <input type="password" required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={password} onChange={e=>setPassword(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">تأكيد كلمة المرور</label>
                                    <input type="password" required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} />
                                </div>
                            </div>

                            <button onClick={handleRegister} disabled={loading} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="animate-spin"/> : <>إتمام التسجيل <CheckCircle size={20}/></>}
                            </button>
                        </div>
                    )}

                    <button onClick={onBack} className="w-full text-center text-gray-400 text-xs font-bold hover:underline">العودة لشاشة الدخول</button>
                </div>
            </div>
        </div>
    );
};

export default ParentRegistration;
