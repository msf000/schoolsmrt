
import React, { useState, useEffect } from 'react';
import { Teacher, SystemUser, School } from '../types';
import { fetchTeachers, updateTeacher, getSchools, addTeacher } from '../services/storageService';
import { 
    Users, ShieldCheck, Mail, Phone, BookOpen, Trash2, Edit, 
    Plus, Search, RefreshCw, Loader2, UserPlus, ShieldAlert, CheckCircle, ChevronLeft
} from 'lucide-react';

const TeacherManagement: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchTeachers();
        // تصفية المعلمين حسب مدرسة المدير الحالي
        setTeachers(data.filter(t => t.schoolId === currentUser.schoolId));
        setLoading(false);
    };

    const toggleStatus = async (teacher: Teacher) => {
        const updated = { ...teacher, status: (teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as any };
        await updateTeacher(updated);
        loadData();
    };

    return (
        <div className="space-y-8 page-enter font-tajawal">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">إدارة الكادر التعليمي</h1>
                    <p className="text-slate-500 text-sm">إدارة صلاحيات المعلمين ومتابعة حالة حساباتهم النشطة.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95">
                    <UserPlus size={18}/> إضافة معلم جديد
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                    <input className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" placeholder="بحث باسم المعلم أو التخصص..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-3 px-6 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Users size={16} className="text-brand-500"/> إجمالي الطاقم: {teachers.length}
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={48}/>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">جاري جلب بيانات المعلمين...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                    <th className="px-8 py-5">المعلم</th>
                                    <th className="px-8 py-5">التخصص الدراسي</th>
                                    <th className="px-8 py-5">التواصل</th>
                                    <th className="px-8 py-5 text-center">الحالة</th>
                                    <th className="px-8 py-5 text-left">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {teachers.filter(t => t.name.includes(searchTerm) || t.subjectSpecialty?.includes(searchTerm)).map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 border border-slate-200 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-inner">
                                                    {t.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-base">{t.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">رقم السجل: {t.nationalId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100 uppercase">{t.subjectSpecialty || 'معلم عام'}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Mail size={12}/> {t.email}</div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Phone size={12}/> {t.phone}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <button onClick={() => toggleStatus(t)} className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}>
                                                {t.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 text-left">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit size={18}/></button>
                                                <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {teachers.length === 0 && (
                            <div className="py-32 flex flex-col items-center justify-center opacity-30">
                                <Users size={80} className="mb-4" />
                                <p className="text-2xl font-black">لم يتم إضافة معلمين بعد</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherManagement;
