
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, Student, SystemUser, AttendanceStatus, PurchaseRequest, ParentRequest } from '../types';
import { getAttendance, saveAttendance, getStudents, getPurchaseRequests, updatePurchaseStatus, fetchParentRequests, saveParentRequest } from '../services/storageService';
import { Inbox, Check, X, Clock, User, Bell, ShoppingCart, Zap, FileText, ChevronLeft, Loader2, Filter, CalendarCheck, MessageSquare, CheckCircle } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

const TeacherInbox: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [parentRequests, setParentRequests] = useState<ParentRequest[]>([]);
    const [tab, setTab] = useState<'EXCUSES' | 'PURCHASES' | 'MEETINGS'>('EXCUSES');

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        setAttendance(getAttendance());
        setStudents(getStudents());
        setPurchaseRequests(getPurchaseRequests(currentUser.id));
        const pReqs = await fetchParentRequests(currentUser.id);
        setParentRequests(pReqs);
    };

    const excuseRequests = useMemo(() => 
        attendance.filter(a => !!a.excuseNote && a.status === AttendanceStatus.ABSENT)
        .sort((a, b) => b.date.localeCompare(a.date)), 
    [attendance]);

    const handleApproveExcuse = (record: AttendanceRecord) => {
        saveAttendance([{ ...record, status: AttendanceStatus.EXCUSED }]);
        loadData();
        alert('تم قبول العذر بنجاح.');
    };

    const handleMeetingAction = async (req: ParentRequest, status: 'ACCEPTED' | 'COMPLETED') => {
        await saveParentRequest({ ...req, status });
        loadData();
    };

    return (
        <div className="space-y-6 page-enter font-tajawal h-full flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">مركز الطلبات والرسائل</h1>
                    <p className="text-slate-500 text-sm">مراجعة طلبات أولياء الأمور والطلاب قيد الانتظار.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={() => setTab('EXCUSES')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === 'EXCUSES' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>أعذار الغياب ({excuseRequests.length})</button>
                    <button onClick={() => setTab('PURCHASES')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === 'PURCHASES' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>المتجر ({purchaseRequests.filter(r=>r.status==='PENDING').length})</button>
                    <button onClick={() => setTab('MEETINGS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === 'MEETINGS' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>لقاءات أولياء الأمور ({parentRequests.filter(r=>r.status==='PENDING').length})</button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar">
                {tab === 'EXCUSES' && (
                    excuseRequests.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {excuseRequests.map(req => {
                                const student = students.find(s => s.id === req.studentId);
                                return (
                                    <div key={req.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 text-right">
                                                <h4 className="font-bold text-slate-800">{student?.name}</h4>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{student?.className}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed italic text-right">"{req.excuseNote}"</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-3 flex items-center gap-1 justify-end"><Clock size={12}/> غياب يوم: {formatDualDate(req.date)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleApproveExcuse(req)} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-emerald-100">
                                                <Check size={14}/> قبول العذر
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={FileText} label="لا توجد طلبات أعذار حالياً"/>
                    )
                )}

                {tab === 'PURCHASES' && (
                    purchaseRequests.filter(r=>r.status==='PENDING').length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {purchaseRequests.filter(r=>r.status==='PENDING').map(req => (
                                <div key={req.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 mb-1 text-right">{req.studentName}</h4>
                                        <p className="text-xs font-medium text-slate-500 text-right">طلب استبدال: <span className="text-brand-600 font-bold">{req.rewardTitle}</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1 justify-end"><Zap size={12} fill="currentColor"/> تكلفة التفعيل: {req.cost} XP</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={async () => { await updatePurchaseStatus(req.id, 'APPROVED'); loadData(); }} className="px-6 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 shadow-sm transition-all">
                                            تفعيل المكافأة
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={ShoppingCart} label="لا توجد طلبات شراء من المتجر"/>
                    )
                )}

                {tab === 'MEETINGS' && (
                    parentRequests.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {parentRequests.map(req => {
                                const student = students.find(s => s.id === req.studentId);
                                return (
                                    <div key={req.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex-1 text-right">
                                            <div className="flex items-center gap-3 mb-2 justify-end">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${req.type === 'MEETING' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {req.type === 'MEETING' ? 'طلب لقاء' : 'استفسار'}
                                                </span>
                                                <h4 className="font-bold text-slate-800">{student?.name}</h4>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">"{req.content}"</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-3 flex items-center gap-1 justify-end">
                                                {req.status === 'PENDING' ? <Clock size={12}/> : <CheckCircle size={12} className="text-emerald-500"/>}
                                                الحالة: {req.status === 'PENDING' ? 'قيد الانتظار' : 'تم الرد/الموافقة'} • التاريخ: {formatDualDate(req.date)}
                                            </p>
                                        </div>
                                        {req.status === 'PENDING' && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleMeetingAction(req, 'ACCEPTED')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                                                    <Check size={14}/> قبول الموعد
                                                </button>
                                                <button onClick={() => handleMeetingAction(req, 'COMPLETED')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
                                                    إغلاق الطلب
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={CalendarCheck} label="لا توجد طلبات تواصل من أولياء الأمور"/>
                    )
                )}
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, label }: any) => (
    <div className="py-32 text-center opacity-30">
        <Icon size={64} className="mx-auto mb-4" />
        <p className="font-bold text-xl">{label}</p>
    </div>
);

export default TeacherInbox;
