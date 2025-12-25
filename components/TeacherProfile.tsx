
import React, { useState, useEffect } from 'react';
import { Teacher, SystemUser, School } from '../types';
import { getTeachers, updateTeacher, getSchools, updateSystemUser } from '../services/storageService';
import { User, Mail, Phone, Shield, Building, Save, Camera, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface TeacherProfileProps {
    currentUser: SystemUser;
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({ currentUser }) => {
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [school, setSchool] = useState<School | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', specialty: '', password: ''
    });

    useEffect(() => {
        const teachers = getTeachers();
        const me = teachers.find(t => t.id === currentUser.id) || teachers.find(t => t.nationalId === currentUser.nationalId);
        if (me) {
            setTeacher(me);
            setFormData({
                name: me.name,
                email: me.email || '',
                phone: me.phone || '',
                specialty: me.subjectSpecialty || '',
                password: me.password || ''
            });
            if (me.schoolId) {
                const schools = getSchools();
                setSchool(schools.find(s => s.id === me.schoolId) || null);
            }
        }
    }, [currentUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher) return;
        setIsSaving(true);
        try {
            const updatedTeacher: Teacher = {
                ...teacher,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                subjectSpecialty: formData.specialty,
                password: formData.password
            };
            await updateTeacher(updatedTeacher);
            
            // Also update the core system user object
            const updatedUser: SystemUser = {
                ...currentUser,
                name: formData.name,
                email: formData.email,
                phone: formData.phone
            };
            await updateSystemUser(updatedUser);
            
            // Update local storage for active session
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
            
            alert('تم تحديث الملف الشخصي بنجاح!');
        } catch (e) {
            alert('فشل تحديث البيانات.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!teacher) return <div className="p-10 text-center text-gray-400">جاري تحميل بياناتك...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in font-tajawal">
            <div className="mb-10 text-center">
                <div className="relative inline-block">
                    <div className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-white">
                        {teacher.name.charAt(0)}
                    </div>
                    <button className="absolute -bottom-2 -right-2 p-3 bg-white rounded-2xl shadow-xl border border-slate-100 text-indigo-600 hover:scale-110 transition-transform">
                        <Camera size={20}/>
                    </button>
                </div>
                <h2 className="text-3xl font-black text-gray-800 mt-6">{teacher.name}</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-1">{teacher.subjectSpecialty || 'معلم نظام'}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <form onSubmit={handleSave} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                        <h3 className="font-black text-gray-800 text-xl border-b pb-4 flex items-center gap-3">
                            <User className="text-indigo-600"/> المعلومات الشخصية
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الاسم الكامل</label>
                                <input className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">رقم الهوية (ثابت)</label>
                                <input className="w-full p-3 bg-slate-100 border rounded-2xl font-mono text-gray-400" value={teacher.nationalId} disabled />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">البريد الإلكتروني</label>
                                <input className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">رقم الجوال</label>
                                <input className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>

                        <div className="pt-6 border-t">
                            <h3 className="font-black text-gray-800 text-xl mb-6 flex items-center gap-3">
                                <Lock className="text-indigo-600"/> الأمان
                            </h3>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">كلمة المرور الجديدة</label>
                                <input type="password" placeholder="أدخل كلمة مرور جديدة للتغيير" className="w-full p-3 bg-slate-50 border rounded-2xl" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>}
                            حفظ كافة التغييرات
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Building size={100}/></div>
                        <h3 className="font-black text-lg mb-6 border-b border-white/10 pb-4">المدرسة المسجل بها</h3>
                        {school ? (
                            <div className="space-y-4">
                                <div><p className="text-[10px] font-black text-indigo-300 uppercase">اسم المنشأة</p><p className="font-black text-xl">{school.name}</p></div>
                                <div><p className="text-[10px] font-black text-indigo-300 uppercase">الرمز الوزاري</p><p className="font-mono text-xl">{school.ministryCode}</p></div>
                                <div className="pt-4"><span className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase border border-white/10">متصل سحابياً ✅</span></div>
                            </div>
                        ) : (
                            <div className="text-indigo-300 italic text-sm">غير مرتبط بمدرسة حالياً</div>
                        )}
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2"><Shield className="text-emerald-600"/> صلاحيات الحساب</h3>
                        <div className="space-y-3">
                            <li className="flex items-center gap-3 text-xs font-bold text-gray-600"><CheckCircle2 className="text-emerald-500" size={16}/> وصول كامل للفصول</li>
                            <li className="flex items-center gap-3 text-xs font-bold text-gray-600"><CheckCircle2 className="text-emerald-500" size={16}/> تقارير الذكاء الاصطناعي</li>
                            <li className="flex items-center gap-3 text-xs font-bold text-gray-600"><CheckCircle2 className="text-emerald-500" size={16}/> إدارة الأوسمة المتقدمة</li>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherProfile;
