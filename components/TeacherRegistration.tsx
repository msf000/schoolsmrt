
import React, { useState, useEffect } from 'react';
import { Teacher, School, SystemUser } from '../types';
import { addTeacher, getTeachers, getSchools, addSchool, addSystemUser, fetchSchools, fetchSystemUsers, updateTeacher } from '../services/storageService';
import { User, Mail, Phone, Lock, BookOpen, ShieldCheck, School as SchoolIcon, ArrowRight, CheckCircle, Loader2, AlertCircle, Info, MapPin, Building, RefreshCw, Sparkles } from 'lucide-react';

interface TeacherRegistrationProps {
    onBack: () => void;
    onRegisterSuccess: (email: string, pass: string) => void;
}

const TeacherRegistration: React.FC<TeacherRegistrationProps> = ({ onBack, onRegisterSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        nationalId: '',
        email: '',
        phone: '',
        specialty: '',
        password: '',
        confirmPassword: '',
        schoolCode: '',       
        schoolName: '',       
        managerName: '',      
        managerNationalId: '', 
        educationAdmin: '',   
        schoolType: 'PUBLIC'  
    });
    
    const [foundSchool, setFoundSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const syncData = async () => {
            setIsSyncing(true);
            try {
                await Promise.all([fetchSchools(), fetchSystemUsers()]);
            } catch (e) {
                console.error("Registration Sync Error:", e);
            } finally {
                setIsSyncing(false);
            }
        };
        syncData();
    }, []);

    useEffect(() => {
        if (formData.schoolCode.length >= 3) {
            const schools = getSchools();
            const match = schools.find((s: School) => s.ministryCode === formData.schoolCode);
            setFoundSchool(match || null);
        } else {
            setFoundSchool(null);
        }
    }, [formData.schoolCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('كلمات المرور غير متطابقة.');
            setLoading(false);
            return;
        }

        try {
            let schoolId = foundSchool?.id;

            if (!foundSchool && formData.schoolCode) {
                // Corrected: Mapping camelCase properties for School interface
                const newSchool: School = {
                    id: `sch_${Date.now()}`,
                    name: formData.schoolName || 'مدرسة جديدة',
                    ministryCode: formData.schoolCode,
                    managerName: formData.managerName,
                    managerNationalId: formData.managerNationalId,
                    educationAdministration: formData.educationAdmin,
                    type: formData.schoolType as any
                };
                await addSchool(newSchool);
                schoolId = newSchool.id;

                // إنشاء حساب المدير آلياً
                const managerPass = formData.managerNationalId.slice(-4);
                await addSystemUser({
                    id: `mgr_${Date.now()}`,
                    name: formData.managerName,
                    email: `mgr.${formData.managerNationalId}@system.local`,
                    password: managerPass,
                    role: 'SCHOOL_MANAGER',
                    nationalId: formData.managerNationalId,
                    schoolId: schoolId,
                    status: 'ACTIVE'
                });
            }

            const teacher: Teacher = {
                id: `tea_${Date.now()}`,
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'TEACHER',
                nationalId: formData.nationalId,
                schoolId: schoolId,
                subjectSpecialty: formData.specialty,
                status: 'ACTIVE',
                phone: formData.phone,
                subscriptionStatus: 'FREE'
            };

            await addTeacher(teacher);
            alert('تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.');
            onRegisterSuccess(formData.email, formData.password);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء التسجيل.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-tajawal" dir="rtl">
            <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
                <div className="bg-indigo-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120}/></div>
                    <h2 className="text-3xl font-black relative z-10">إنضمام معلم جديد</h2>
                    <p className="text-indigo-200 text-sm mt-1 relative z-10">ابدأ رحلتك التعليمية الذكية اليوم</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-black text-slate-800 border-r-4 border-indigo-600 pr-3 mb-4">بياناتك الشخصية</h3>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الاسم الكامل</label><input required name="name" className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold" value={formData.name} onChange={handleChange}/></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">رقم الهوية</label><input required name="nationalId" className="w-full p-3 bg-slate-50 border-none rounded-xl font-mono" value={formData.nationalId} onChange={handleChange}/></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">البريد الإلكتروني</label><input required type="email" name="email" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.email} onChange={handleChange}/></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">كلمة المرور</label><input required type="password" name="password" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.password} onChange={handleChange}/></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">تأكيد كلمة المرور</label><input required type="password" name="confirmPassword" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.confirmPassword} onChange={handleChange}/></div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-black text-slate-800 border-r-4 border-teal-600 pr-3 mb-4">بيانات المدرسة</h3>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الرمز الوزاري</label><input required name="schoolCode" className="w-full p-3 bg-slate-50 border-none rounded-xl font-mono" value={formData.schoolCode} onChange={handleChange} placeholder="مثال: 12345"/></div>
                            
                            {!foundSchool && formData.schoolCode.length >= 3 && (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 animate-slide-up space-y-4">
                                    <p className="text-[10px] text-amber-700 font-bold">هذه المدرسة غير مسجلة، يرجى تزويدنا ببياناتها:</p>
                                    <input name="schoolName" placeholder="اسم المدرسة" className="w-full p-2 text-xs rounded-lg border" value={formData.schoolName} onChange={handleChange}/>
                                    <input name="managerName" placeholder="اسم مدير المدرسة" className="w-full p-2 text-xs rounded-lg border" value={formData.managerName} onChange={handleChange}/>
                                    <input name="managerNationalId" placeholder="رقم هوية المدير (لحسابه)" className="w-full p-2 text-xs rounded-lg border" value={formData.managerNationalId} onChange={handleChange}/>
                                </div>
                            )}
                            
                            {foundSchool && (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                    <Building className="text-emerald-600"/>
                                    <div>
                                        <p className="text-xs font-black text-emerald-900">{foundSchool.name}</p>
                                        <p className="text-[10px] text-emerald-600">سيتم ربط حسابك بهذه المنشأة</p>
                                    </div>
                                </div>
                            )}

                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">تخصصك التدريسي</label><input required name="specialty" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.specialty} onChange={handleChange} placeholder="مثلاً: رياضيات، فيزياء..."/></div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t">
                        <button type="button" onClick={onBack} className="px-8 py-4 text-slate-400 font-bold">رجوع</button>
                        <button type="submit" disabled={loading} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
                            {loading ? <Loader2 className="animate-spin"/> : <CheckCircle/>} إتمام التسجيل
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeacherRegistration;
