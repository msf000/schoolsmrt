
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, Student, SystemUser, AttendanceStatus, PurchaseRequest } from '../types';
import { getAttendance, saveAttendance, getStudents, getPurchaseRequests, updatePurchaseStatus, updateStudent } from '../services/storageService';
import { Inbox, Check, X, Clock, User, Bell, ShoppingCart, Zap, FileText, ChevronLeft, Loader2 } from 'lucide-react';
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
        alert('تم قبول العذر وتعديل حالة الغياب.');
    };

    const handleApprovePurchase = async (req: PurchaseRequest) => {
        await updatePurchaseStatus(req.id, 'APPROVED');
        setPurchaseRequests(getPurchaseRequests(currentUser.id));
        alert('تم تفعيل المكافأة للطالب بنجاح.');
    };

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Inbox className="text-indigo-600" size={32} /> بريد المعلم
                    </h2>
                    <p className="text-sm text-gray-400 font-bold uppercase mt-1">طلبات أولياء الأمور والطلاب قيد الانتظار</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
                    <button onClick={() => setTab('EXCUSES')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${tab === 'EXCUSES' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>أعذار الغياب ({excuseRequests.length})</button>
                    <button onClick={() => setTab('PURCHASES')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${tab === 'PURCHASES' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'}`}>طلبات المتجر ({purchaseRequests.filter(r=>r.status==='PENDING').length})</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {tab === 'EXCUSES' ? (
                    excuseRequests.length > 0 ? excuseRequests.map(req => {
                        const student = students.find(s => s.id === req.studentId);
                        return (
                            <div key={req.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 items-center group">
                                <div className="flex items-center gap-6 min-w-[250px]">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">
                                        {student?.name.charAt(0)}
                                    </div>
                                    <div className="text-right">
                                        <h4 className="font-black text-gray-800 text-lg">{student?.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{student?.className} • {formatDualDate(req.date)}</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <p className="text-sm text-gray-600 leading-relaxed italic font-medium">"{req.excuseNote}"</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleApproveExcuse(req)} className="p-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm"><Check size={28}/></button>
                                    <button className="p-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"><X size={28}/></button>
                                </div>
                            </div>
                        );
                    }) : <EmptyState icon={<FileText/>} label="لا توجد أعذار طبية مرسلة"/>
                ) : (
                    purchaseRequests.filter(r=>r.status==='PENDING').length > 0 ? purchaseRequests.filter(r=>r.status==='PENDING').map(req => (
                        <div key={req.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 items-center group">
                            <div className="flex items-center gap-6 min-w-[250px]">
                                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-black text-2xl shadow-inner group-hover:scale-110 transition-transform"><ShoppingCart size={28}/></div>
                                <div className="text-right">
                                    <h4 className="font-black text-gray-800 text-lg">{req.studentName}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">طلب مكافأة • {formatDualDate(req.date)}</p>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center gap-6 bg-purple-50/30 p-6 rounded-3xl border border-purple-100">
                                <div>
                                    <h5 className="font-black text-purple-900 text-xl mb-1">{req.rewardTitle}</h5>
                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400"><Zap size={14} fill="currentColor"/> تكلفة الاستبدال: {req.cost} XP</div>
                                </div>
                            </div>
                            <button onClick={() => handleApprovePurchase(req)} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all active:scale-95">تفعيل الآن</button>
                        </div>
                    )) : <EmptyState icon={<ShoppingCart/>} label="لا توجد طلبات مكافآت"/>
                )}
            </div>
        </div>
    );
};

const EmptyState = ({ icon, label }: any) => (
    <div className="h-full flex flex-col items-center justify-center py-40 text-slate-300 opacity-40 border-4 border-dashed rounded-[4rem]">
        {React.cloneElement(icon, { size: 100, strokeWidth: 1.5 })}
        <p className="text-3xl font-black mt-6">{label}</p>
    </div>
);

export default TeacherInbox;
