
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, Student, SystemUser, AttendanceStatus } from '../types';
import { getAttendance, saveAttendance, getStudents } from '../services/storageService';
import { Mail, Check, X, FileText, ExternalLink, Image as ImageIcon, Clock, User, MessageCircle, AlertCircle, Inbox, Search } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface TeacherInboxProps {
    currentUser: SystemUser;
}

const TeacherInbox: React.FC<TeacherInboxProps> = ({ currentUser }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

    useEffect(() => {
        setAttendance(getAttendance());
        setStudents(getStudents());
    }, []);

    // الأعذار هي السجلات التي تحتوي على ملاحظة عذر ولم يتم تغيير حالتها إلى "بعذر" أو تحتاج مراجعة
    const excuseRequests = useMemo(() => {
        return attendance.filter(a => {
            const hasExcuse = !!a.excuseNote;
            if (filter === 'PENDING') return hasExcuse && a.status === AttendanceStatus.ABSENT;
            return hasExcuse;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendance, filter]);

    const handleApprove = (record: AttendanceRecord) => {
        const updated: AttendanceRecord = { ...record, status: AttendanceStatus.EXCUSED };
        saveAttendance([updated]);
        setAttendance(getAttendance());
        alert('تم قبول العذر وتعديل حالة الحضور للطالب.');
    };

    const handleReject = (record: AttendanceRecord) => {
        const updated: AttendanceRecord = { ...record, excuseNote: `(مرفوض) ${record.excuseNote}` };
        saveAttendance([updated]);
        setAttendance(getAttendance());
        alert('تم رفض العذر.');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Inbox className="text-indigo-600" /> بريد طلبات أولياء الأمور
                    </h2>
                    <p className="text-sm text-gray-500">مراجعة الأعذار الطبية وطلبات الاستئذان.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={() => setFilter('PENDING')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'PENDING' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>قيد الانتظار</button>
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>الكل</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {excuseRequests.map(req => {
                    const student = students.find(s => s.id === req.studentId);
                    return (
                        <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                            {req.status === AttendanceStatus.EXCUSED && (
                                <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 rounded-br-xl text-[10px] font-bold">تم القبول</div>
                            )}
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                        {student?.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{student?.name}</h4>
                                        <p className="text-xs text-gray-400">{student?.className} • {formatDualDate(req.date)}</p>
                                    </div>
                                </div>

                                <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 italic text-sm text-gray-600 relative">
                                    <MessageCircle size={16} className="absolute -top-2 -right-2 text-gray-300"/>
                                    "{req.excuseNote}"
                                    {req.excuseFile && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <a href={req.excuseFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
                                                <ImageIcon size={14}/> عرض المرفق الطبي
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {req.status === AttendanceStatus.ABSENT && (
                                        <>
                                            <button onClick={() => handleApprove(req)} className="p-3 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all shadow-sm" title="قبول العذر">
                                                <Check size={20}/>
                                            </button>
                                            <button onClick={() => handleReject(req)} className="p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm" title="رفض">
                                                <X size={20}/>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {excuseRequests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-50 bg-white rounded-3xl border-2 border-dashed">
                        <Inbox size={64} className="mb-4"/>
                        <p className="text-lg font-bold">صندوق الوارد فارغ</p>
                        <p className="text-sm">لا توجد طلبات أعذار تحتاج للمراجعة حالياً.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherInbox;
