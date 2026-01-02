
import React, { useState, useEffect } from 'react';
import { ParentRequest, SystemUser, Student } from '../types';
import { fetchParentRequests, saveParentRequest, getStudents } from '../services/storageService';
import { Calendar, Clock, MessageCircle, CheckCircle, XCircle, User, Info, CalendarCheck, ArrowLeft, History, Plus, X } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface Props {
    currentUser: SystemUser;
    isTeacherView: boolean;
}

const MeetingScheduler: React.FC<Props> = ({ currentUser, isTeacherView }) => {
    const [requests, setRequests] = useState<ParentRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({ studentId: '', type: 'MEETING' as any, content: '', date: '' });

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const res = await fetchParentRequests(currentUser.id);
        setRequests(res);
        setStudents(getStudents());
    };

    const handleStatusUpdate = async (req: ParentRequest, status: 'ACCEPTED' | 'COMPLETED') => {
        await saveParentRequest({ ...req, status });
        loadData();
    };

    const handleSubmitRequest = async () => {
        if (!newRequest.studentId || !newRequest.date) return;
        const req: ParentRequest = {
            id: `req_${Date.now()}`,
            parentId: currentUser.id,
            studentId: newRequest.studentId,
            teacherId: isTeacherView ? currentUser.id : '', 
            type: newRequest.type,
            content: newRequest.content,
            status: 'PENDING',
            date: newRequest.date
        };
        await saveParentRequest(req);
        setIsModalOpen(false);
        loadData();
        alert('تم حفظ موعد اللقاء في السجل بنجاح.');
    };

    return (
        <div className="p-4 lg:p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <CalendarCheck className="text-indigo-600" size={36}/> منظم اللقاءات الأسرية
                    </h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Parent-Teacher Conference Management</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all">جدولة لقاء جديد</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 pb-20">
                {requests.length > 0 ? requests.map(req => {
                    const student = students.find(s => s.id === req.studentId);
                    return (
                        <div key={req.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 items-center group">
                            <div className="flex items-center gap-6 min-w-[250px]">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner transition-colors ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {req.status === 'PENDING' ? <Clock/> : <CheckCircle/>}
                                </div>
                                <div className="text-right">
                                    <h4 className="font-black text-gray-800 text-lg">{student?.name || 'طالب مجهول'}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{req.type === 'MEETING' ? 'لقاء حضوري' : 'استفسار أكاديمي'}</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                <p className="text-xs text-slate-400 font-black mb-2 flex items-center gap-2"><MessageCircle size={14}/> موضوع النقاش:</p>
                                <p className="text-sm text-gray-700 leading-relaxed italic font-medium">"{req.content}"</p>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-indigo-600">
                                    <Calendar size={12}/> الموعد المجدول: {formatDualDate(req.date)}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {req.status === 'PENDING' && isTeacherView && (
                                    <button onClick={() => handleStatusUpdate(req, 'ACCEPTED')} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-emerald-700 transition-all">موافقة</button>
                                )}
                                {req.status === 'ACCEPTED' && isTeacherView && (
                                    <button onClick={() => handleStatusUpdate(req, 'COMPLETED')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg">تم اللقاء</button>
                                )}
                                <button className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><XCircle size={20}/></button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="h-full flex flex-col items-center justify-center py-40 text-slate-200 opacity-20">
                        <CalendarCheck size={120} strokeWidth={1}/>
                        <p className="text-3xl font-black mt-6">لا توجد لقاءات مجدولة</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Calendar size={120}/></div>
                             <h3 className="text-xl font-black relative z-10 flex items-center gap-2"><Plus size={20}/> جدولة موعد لقاء</h3>
                             <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full relative z-10"><X/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الطالب المعني</label>
                                <select className="w-full p-3.5 border rounded-2xl bg-slate-50 font-black text-sm outline-none" value={newRequest.studentId} onChange={e=>setNewRequest({...newRequest, studentId: e.target.value})}>
                                    <option value="">-- اختر الطالب --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">التاريخ المخطط</label>
                                <input type="date" className="w-full p-3.5 border rounded-2xl bg-slate-50 font-black text-sm" value={newRequest.date} onChange={e=>setNewRequest({...newRequest, date: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">ملاحظات التحضير للقاء</label>
                                <textarea className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm min-h-[100px]" value={newRequest.content} onChange={e=>setNewRequest({...newRequest, content: e.target.value})} placeholder="ما هي النقاط التي سيتم مناقشتها؟"/>
                            </div>
                            <button onClick={handleSubmitRequest} className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">تثبيت الموعد في الأجندة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingScheduler;
