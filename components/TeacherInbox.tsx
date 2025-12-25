
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, Student, SystemUser, AttendanceStatus, PurchaseRequest } from '../types';
import { getAttendance, saveAttendance, getStudents, getPurchaseRequests, updatePurchaseStatus, updateStudent } from '../services/storageService';
import { Mail, Check, X, FileText, ExternalLink, Image as ImageIcon, Clock, User, MessageCircle, AlertCircle, Inbox, Search, ShoppingCart, Zap, CheckCircle2 } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface TeacherInboxProps {
    currentUser: SystemUser;
}

const TeacherInbox: React.FC<TeacherInboxProps> = ({ currentUser }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
    const [tab, setTab] = useState<'EXCUSES' | 'PURCHASES'>('EXCUSES');

    useEffect(() => {
        const load = async () => {
           setAttendance(getAttendance());
           setStudents(getStudents());
           setPurchaseRequests(getPurchaseRequests(currentUser.id));
        };
        load();
    }, [currentUser]);

    const excuseRequests = useMemo(() => {
        return attendance.filter(a => {
            const hasExcuse = !!a.excuseNote;
            if (filter === 'PENDING') return hasExcuse && a.status === AttendanceStatus.ABSENT;
            return hasExcuse;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendance, filter]);

    const filteredPurchases = useMemo(() => {
        if (filter === 'PENDING') return purchaseRequests.filter(r => r.status === 'PENDING');
        return purchaseRequests;
    }, [purchaseRequests, filter]);

    const handleApproveExcuse = (record: AttendanceRecord) => {
        const updated: AttendanceRecord = { ...record, status: AttendanceStatus.EXCUSED };
        saveAttendance([updated]);
        setAttendance(getAttendance());
        alert('تم قبول العذر وتعديل حالة الحضور.');
    };

    const handleApprovePurchase = async (req: PurchaseRequest) => {
        await updatePurchaseStatus(req.id, 'APPROVED');
        setPurchaseRequests(getPurchaseRequests(currentUser.id));
        alert(`تم تفعيل مكافأة "${req.rewardTitle}" للطالب ${req.studentName}.`);
    };

    const handleRejectPurchase = async (req: PurchaseRequest) => {
        await updatePurchaseStatus(req.id, 'REJECTED');
        const student = students.find(s => s.id === req.studentId);
        if (student) {
            await updateStudent({ ...student, xp: (student.xp || 0) + req.cost });
        }
        setPurchaseRequests(getPurchaseRequests(currentUser.id));
        alert('تم رفض طلب الشراء وإعادة النقاط للطالب.');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Inbox className="text-indigo-600" size={32} /> بريد المعلم المركزي
                    </h2>
                    <p className="text-sm text-gray-500 font-bold uppercase mt-1">إدارة طلبات الأهل والطلاب</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
                    <button onClick={() => setTab('EXCUSES')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${tab === 'EXCUSES' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}>أعذار طبية ({excuseRequests.filter(r=>r.status==='ABSENT').length})</button>
                    <button onClick={() => setTab('PURCHASES')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${tab === 'PURCHASES' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'}`}>طلبات المتجر ({purchaseRequests.filter(r=>r.status==='PENDING').length})</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {tab === 'EXCUSES' ? (
                    excuseRequests.map(req => {
                        const student = students.find(s => s.id === req.studentId);
                        return (
                            <div key={req.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all relative overflow-hidden group">
                                {req.status === AttendanceStatus.EXCUSED && (
                                    <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1.5 rounded-br-2xl text-[10px] font-black uppercase">معتمد</div>
                                )}
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex items-center gap-4 min-w-[220px]">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                                            {student?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-800">{student?.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold">{student?.className} • {formatDualDate(req.date)}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 relative">
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">"{req.excuseNote}"</p>
                                    </div>
                                    {req.status === AttendanceStatus.ABSENT && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleApproveExcuse(req)} className="p-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm"><Check size={24}/></button>
                                            <button className="p-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"><X size={24}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    filteredPurchases.map(req => (
                        <div key={req.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all relative overflow-hidden group">
                            {req.status === 'APPROVED' && (
                                <div className="absolute top-0 left-0 bg-purple-500 text-white px-4 py-1.5 rounded-br-2xl text-[10px] font-black">مفعلة</div>
                            )}
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex items-center gap-4 min-w-[220px]">
                                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-black text-xl shadow-inner">
                                        <ShoppingCart size={24}/>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800">{req.studentName}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold">طلب شراء مكافأة • {formatDualDate(req.date)}</p>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center gap-4">
                                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex-1">
                                        <h5 className="font-black text-purple-900 text-lg mb-1">{req.rewardTitle}</h5>
                                        <div className="flex items-center gap-2 text-xs font-bold text-purple-400"><Zap size={12} fill="currentColor"/> تم خصم {req.cost} XP من رصيد الطالب</div>
                                    </div>
                                </div>
                                {req.status === 'PENDING' && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleApprovePurchase(req)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all">تفعيل الآن</button>
                                        <button onClick={() => handleRejectPurchase(req)} className="p-3 text-red-400 hover:text-red-600 rounded-2xl transition-all"><X size={20}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {((tab === 'EXCUSES' && excuseRequests.length === 0) || (tab === 'PURCHASES' && filteredPurchases.length === 0)) && (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-400 opacity-50 bg-white rounded-[3rem] border-4 border-dashed">
                        <Inbox size={80} className="mb-4 text-indigo-200"/>
                        <p className="text-xl font-black">لا توجد طلبات جديدة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherInbox;
