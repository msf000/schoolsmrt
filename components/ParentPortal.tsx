
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus } from '../types';
import { saveAttendance } from '../services/storageService';
import { User, LogOut, AlertTriangle, Clock, MessageCircle, X } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, onLogout }) => {
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
        alert('تم إرسال العذر للمعلم بنجاح.');
    };

    if (!activeChild) return <div className="p-20 text-center font-bold">لم يتم العثور على بيانات أبناء مرتبطة بهذا الرقم.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
            <header className="bg-indigo-900 text-white p-4 shadow-lg sticky top-0 z-30">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="font-black flex items-center gap-2"><User/> بوابة ولي الأمر</h1>
                    <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors">خروج</button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto w-full p-4 flex-1 space-y-6">
                {myChildren.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {myChildren.map(c => (
                            <button key={c.id} onClick={() => setActiveChildId(c.id)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeChildId === c.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 border'}`}>{c.name}</button>
                        ))}
                    </div>
                )}

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-indigo-100">{activeChild.name.charAt(0)}</div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800">{activeChild.name}</h2>
                        <p className="text-sm text-gray-500 font-bold">{activeChild.className} • {activeChild.gradeLevel}</p>
                    </div>
                </div>

                {stats && stats.unexcused.length > 0 && (
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm animate-slide-up">
                        <h3 className="font-black text-red-700 flex items-center gap-2 mb-4"><AlertTriangle size={20}/> تنبيه: غياب يحتاج لتبرير</h3>
                        <div className="space-y-3">
                            {stats.unexcused.map(rec => (
                                <div key={rec.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                                    <div>
                                        <span className="text-sm font-black text-gray-700">{formatDualDate(rec.date)}</span>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">غائب</p>
                                    </div>
                                    <button onClick={() => { setSelectedAbsentRecord(rec); setIsExcuseModalOpen(true); }} className="text-xs bg-red-600 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-red-700">تقديم عذر</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                    <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 border-b pb-4"><Clock size={20} className="text-indigo-600"/> ملخص الحضور الأخير</h3>
                    <div className="space-y-3">
                        {stats?.recentAtt.map(rec => (
                            <div key={rec.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-sm font-bold text-gray-600">{formatDualDate(rec.date)}</span>
                                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                                    rec.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 
                                    rec.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{rec.status === 'PRESENT' ? 'حاضر' : rec.status === 'ABSENT' ? 'غائب' : 'تأخر'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {isExcuseModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setIsExcuseModalOpen(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600"><X/></button>
                        <h3 className="font-black text-xl text-gray-800 mb-2 flex items-center gap-2"><MessageCircle className="text-indigo-600"/> تقديم مبرر غياب</h3>
                        <p className="text-xs text-gray-400 mb-6 font-bold">ليوم: {selectedAbsentRecord && formatDualDate(selectedAbsentRecord.date)}</p>
                        
                        <textarea 
                            className="w-full p-4 border rounded-2xl h-40 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-gray-50 border-gray-200"
                            placeholder="اكتب سبب الغياب هنا (مثلاً: موعد طبي، ظرف طارئ...)"
                            value={excuseText}
                            onChange={e => setExcuseText(e.target.value)}
                        />
                        
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setIsExcuseModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50">إلغاء</button>
                            <button onClick={handleSubmitExcuse} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700">إرسال العذر</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPortal;
