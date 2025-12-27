
import React, { useState, useEffect } from 'react';
import { ParentRequest, SystemUser, Student } from '../types';
import { fetchParentRequests, saveParentRequest, getStudents } from '../services/storageService';
import { Calendar, Clock, MessageCircle, CheckCircle, XCircle, User, Info, CalendarCheck, ArrowLeft, History } from 'lucide-react';
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
        if (isTeacherView) {
            const res = await fetchParentRequests(currentUser.id);
            setRequests(res);
            setStudents(getStudents());
        }
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
            teacherId: '', // سيتم تحديدها بناءً على الطالب في النظام الفعلي
            type: newRequest.type,
            content: newRequest.content,
            status: 'PENDING',
            date: newRequest.date
        };
        await saveParentRequest(req);
        setIsModalOpen(false);
        alert('تم إرسال الطلب للمعلم بنجاح');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <CalendarCheck className="text-indigo-600" size={32}/> منظم اللقاءات الرسمية
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">نسق اجتماعاتك مع أولياء الأمور والطلاب</p>
                </div>
                {!isTeacherView && (
                    <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all">طلب لقاء جديد</button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 pb-20">
                {requests.length > 0 ? requests.map(req => {
                    const student = students.find(s => s.id === req.studentId);
                    return (
                        <div key={req.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 items-center group">
                            <div className="flex items-center gap-6 min-w-[250px]">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    <Clock/>
                                </div>
                                <div className="text-right">
                                    <h4 className="font-black text-gray-800 text-lg">{student?.name || 'طالب مجهول'}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{req.type === 'MEETING' ? 'لقاء حضوري' : 'استفسار أكاديمي'}</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-xs text-slate-400 font-black mb-2 flex items-center gap-2"><MessageCircle size={14}/> سبب الطلب:</p>
                                <p className="text-sm text-gray-700 leading-relaxed italic font-medium">"{req.content}"</p>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-indigo-600">
                                    <Calendar size={12}/> الموعد المقترح: {formatDualDate(req.date)}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {req.status === 'PENDING' && isTeacherView && (
                                    <button onClick={() => handleStatusUpdate(req, 'ACCEPTED')} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-emerald-700 transition-all">موافقة</button>
                                )}
                                {req.status === 'ACCEPTED' && isTeacherView && (
                                    <button onClick={() => handleStatusUpdate(req, 'COMPLETED')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg">تم اللقاء</button>
                                )}
                                <button className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><XCircle size={20}/></button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="h-full flex flex-col items-center justify-center py-40 text-slate-300 opacity-40 border-4 border-dashed rounded-[4rem]">
                        <Calendar size={100} strokeWidth={1.5} />
                        <p className="text-3xl font-black mt-6">لا توجد طلبات لقاءات حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingScheduler;
