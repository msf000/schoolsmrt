
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, Student, SystemUser, AttendanceStatus, PurchaseRequest } from '../types';
import { getAttendance, saveAttendance, getStudents, getPurchaseRequests, updatePurchaseStatus } from '../services/storageService';
import { Inbox, Check, X, Clock, User, Bell, ShoppingCart, Zap, FileText, ChevronLeft, Loader2, Filter } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

const TeacherInbox: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [tab, setTab] = useState<'EXCUSES' | 'PURCHASES'>('EXCUSES');

    useEffect(() => {
        setAttendance(getAttendance());
        setStudents(getStudents());
        setPurchaseRequests(getPurchaseRequests(currentUser.id));
    }, [currentUser]);

    const excuseRequests = useMemo(() => 
        attendance.filter(a => !!a.excuseNote && a.status === AttendanceStatus.ABSENT)
        .sort((a, b) => b.date.localeCompare(a.date)), 
    [attendance]);

    const handleApproveExcuse = (record: AttendanceRecord) => {
        saveAttendance([{ ...record, status: AttendanceStatus.EXCUSED }]);
        setAttendance(getAttendance());
        alert('تم قبول العذر بنجاح.');
    };

    return (
        <div className="space-y-6 page-enter font-tajawal h-full flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">مركز الطلبات</h1>
                    <p className="text-slate-500 text-sm">مراجعة طلبات أولياء الأمور والطلاب قيد الانتظار.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setTab('EXCUSES')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'EXCUSES' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>أعذار طبية ({excuseRequests.length})</button>
                    <button onClick={() => setTab('PURCHASES')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'PURCHASES' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>المتجر ({purchaseRequests.filter(r=>r.status==='PENDING').length})</button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar">
                {tab === 'EXCUSES' ? (
                    excuseRequests.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {excuseRequests.map(req => {
                                const student = students.find(s => s.id === req.studentId);
                                return (
                                    <div key={req.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-bold text-slate-800">{student?.name}</h4>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{student?.className}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed italic">"{req.excuseNote}"</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-3 flex items-center gap-1"><Clock size={12}/> غياب يوم: {formatDualDate(req.date)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleApproveExcuse(req)} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-emerald-100">
                                                <Check size={14}/> قبول
                                            </button>
                                            <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                                <X size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={FileText} label="لا توجد طلبات أعذار حالياً"/>
                    )
                ) : (
                    purchaseRequests.filter(r=>r.status==='PENDING').length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {purchaseRequests.filter(r=>r.status==='PENDING').map(req => (
                                <div key={req.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 mb-1">{req.studentName}</h4>
                                        <p className="text-xs font-medium text-slate-500">طلب استبدال: <span className="text-brand-600 font-bold">{req.rewardTitle}</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1"><Zap size={12} fill="currentColor"/> تكلفة التفعيل: {req.cost} XP</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={async () => { await updatePurchaseStatus(req.id, 'APPROVED'); setPurchaseRequests(getPurchaseRequests(currentUser.id)); }} className="px-6 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 shadow-sm transition-all">
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
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, label }: any) => (
    <div className="py-20 text-center opacity-30">
        <Icon size={48} className="mx-auto mb-4" />
        <p className="font-bold">{label}</p>
    </div>
);

export default TeacherInbox;
