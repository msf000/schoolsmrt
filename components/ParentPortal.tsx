
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, MessageLog, AcademicTerm, Exam, ExamResult } from '../types';
import { getMessages, getExams, getAcademicTerms, saveAttendance, getExamResults } from '../services/storageService';
import { User, Calendar, Award, LogOut, Phone, Mail, ChevronDown, CheckCircle, AlertTriangle, Clock, X, MessageSquare, TrendingUp, Bell, FileQuestion, Send, Upload, Paperclip, ArrowRight } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, performance, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const myChildren = useMemo(() => 
        allStudents.filter(s => s.parentPhone === parentPhone || s.parentPhone?.replace(/\s/g, '') === parentPhone),
    [allStudents, parentPhone]);

    const [activeChildId, setActiveChildId] = useState<string>(myChildren.length > 0 ? myChildren[0].id : '');
    const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0];
    
    const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
    const [selectedAbsentRecord, setSelectedAbsentRecord] = useState<AttendanceRecord | null>(null);
    const [excuseText, setExcuseText] = useState('');

    const stats = useMemo(() => {
        if (!activeChild) return null;
        const childAtt = attendance.filter(a => a.studentId === activeChild.id);
        const absent = childAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const unexcused = childAtt.filter(a => a.status === AttendanceStatus.ABSENT && !a.excuseNote);
        const recentAtt = [...childAtt].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        return { absent, unexcused, recentAtt };
    }, [activeChild, attendance]);

    const handleSubmitExcuse = () => {
        if (!selectedAbsentRecord || !excuseText) return;
        const updated: AttendanceRecord = { ...selectedAbsentRecord, excuseNote: excuseText };
        saveAttendance([updated]);
        setIsExcuseModalOpen(false);
        setExcuseText('');
        alert('تم إرسال العذر للمعلم');
        window.location.reload();
    };

    if (!activeChild) return <div className="p-20 text-center">لم يتم العثور على بيانات الأبناء.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
            <header className="bg-indigo-900 text-white p-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="font-bold flex items-center gap-2"><User/> بوابة ولي الأمر</h1>
                    <button onClick={onLogout} className="bg-red-500 px-3 py-1 rounded text-xs">خروج</button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto w-full p-4 flex-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{activeChild.name.charAt(0)}</div>
                    <div>
                        <h2 className="text-xl font-bold">{activeChild.name}</h2>
                        <p className="text-sm text-gray-500">{activeChild.className}</p>
                    </div>
                </div>

                {stats?.unexcused.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                        <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3"><AlertTriangle size={18}/> تنبيه: يوجد غياب غير مبرر</h3>
                        <div className="space-y-2">
                            {stats.unexcused.map(rec => (
                                <div key={rec.id} className="flex justify-between items-center bg-white p-3 rounded-lg border">
                                    <span className="text-sm font-bold">{formatDualDate(rec.date)}</span>
                                    <button onClick={() => { setSelectedAbsentRecord(rec); setIsExcuseModalOpen(true); }} className="text-xs bg-red-600 text-white px-3 py-1 rounded-full">تقديم عذر</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="font-bold mb-4 flex items-center gap-2 border-b pb-2"><Clock size={18}/> سجل الحضور الأخير</h3>
                    <div className="space-y-3">
                        {stats?.recentAtt.map(rec => (
                            <div key={rec.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">{formatDualDate(rec.date)}</span>
                                <span className={`text-xs font-bold ${rec.status === 'PRESENT' ? 'text-green-600' : 'text-red-600'}`}>{rec.status === 'PRESENT' ? 'حاضر' : 'غائب'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {isExcuseModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">تقديم مبرر للغياب</h3>
                        <textarea 
                            className="w-full p-3 border rounded-xl h-32 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            placeholder="اكتب المبرر هنا (مثلاً: موعد طبي، ظرف طارئ...)"
                            value={excuseText}
                            onChange={e => setExcuseText(e.target.value)}
                        />
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => setIsExcuseModalOpen(false)} className="flex-1 py-2 border rounded-xl">إلغاء</button>
                            <button onClick={handleSubmitExcuse} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold">إرسال</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPortal;
