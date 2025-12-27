
import React, { useState } from 'react';
import { Student, BehaviorIncident, SystemUser } from '../types';
import { ShieldAlert, FileText, CheckCircle, Clock, Info, User, Plus, X, Search, Sparkles, TrendingUp, Trash2, History } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface Props {
    students: Student[];
    incidents: BehaviorIncident[];
    currentUser: SystemUser;
}

const InterventionLog: React.FC<Props> = ({ students, incidents, currentUser }) => {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newLog, setNewLog] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });

    const studentInterventions = students.filter(s => {
        const studentIncidents = incidents.filter(i => i.studentId === s.id && i.type === 'NEGATIVE');
        return studentIncidents.length >= 3;
    });

    const activeInterventions = [
        { id: '1', studentId: students[0]?.id, title: 'خطة تعديل سلوك', date: '2023-10-25', status: 'ACTIVE' },
        { id: '2', studentId: students[1]?.id, title: 'لقاء مع ولي الأمر', date: '2023-10-20', status: 'COMPLETED' },
    ];

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <ShieldAlert className="text-rose-600" size={36}/> مركز التدخلات التربوية
                </h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">توثيق ومتابعة الخطط العلاجية السلوكية</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 overflow-hidden">
                <div className="xl:col-span-1 bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col gap-6 overflow-y-auto">
                    <h3 className="font-black text-slate-800 border-b pb-4 flex items-center gap-2 text-sm"><Info className="text-indigo-600" size={18}/> حالات تستوجب التدخل</h3>
                    <div className="space-y-3">
                        {studentInterventions.map(s => (
                            <div key={s.id} className="p-5 bg-rose-50 rounded-3xl border border-rose-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-rose-600 shadow-sm">{s.name.charAt(0)}</div>
                                    <div>
                                        <p className="font-black text-rose-900 text-sm">{s.name}</p>
                                        <p className="text-[10px] text-rose-400 font-black uppercase">{incidents.filter(i=>i.studentId===s.id && i.type==='NEGATIVE').length} تنبيهات سلوكية</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedStudentId(s.id); setIsAddOpen(true); }} className="p-2 bg-rose-600 text-white rounded-xl shadow-lg hover:bg-rose-700 transition-all"><Plus size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-2 bg-white rounded-[4rem] border shadow-sm flex flex-col overflow-hidden relative">
                    <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 flex items-center gap-2"><History size={20}/> سجل الإجراءات المتخذة</h3>
                        <div className="relative w-64">
                            <Search className="absolute right-3 top-2 text-slate-300" size={16}/>
                            <input className="w-full pr-10 pl-4 py-2 border rounded-xl text-xs font-bold" placeholder="بحث في السجلات..."/>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                        {activeInterventions.map(iv => {
                            const student = students.find(s => s.id === iv.studentId);
                            return (
                                <div key={iv.id} className="p-6 rounded-[2.5rem] border-2 border-slate-50 hover:border-indigo-100 hover:shadow-xl transition-all group bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black transition-transform group-hover:scale-110"><FileText size={24}/></div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg">{iv.title}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student?.name} • {formatDualDate(iv.date)}</p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${iv.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {iv.status === 'ACTIVE' ? 'قيد المتابعة' : 'تم الإغلاق'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed pr-16 mb-4">تم الاجتماع مع الطالب وتوقيعه على تعهد بعدم تكرار التأخير، مع إبلاغ ولي الأمر عبر البوابة الذكية.</p>
                                    <div className="flex justify-end gap-2">
                                        <button className="px-6 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-black hover:bg-indigo-50 hover:text-indigo-600 transition-all">تحميل المحضر</button>
                                        <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isAddOpen && (
                <div className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><ShieldAlert size={100}/></div>
                             <h3 className="text-xl font-black relative z-10 flex items-center gap-2"><Sparkles size={20}/> توثيق تدخل تربوي</h3>
                             <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-white/10 rounded-full relative z-10"><X/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">نوع التدخل</label><input className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm" value={newLog.title} onChange={e=>setNewLog({...newLog, title: e.target.value})} placeholder="مثلاً: جلسة إرشادية أولى"/></div>
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">تفاصيل الإجراء والنتائج</label><textarea className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm min-h-[150px]" value={newLog.content} onChange={e=>setNewLog({...newLog, content: e.target.value})} placeholder="اكتب ما تم خلال الجلسة..."/></div>
                            <button onClick={() => setIsAddOpen(false)} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">حفظ وإدراج في ملف الطالب</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterventionLog;
