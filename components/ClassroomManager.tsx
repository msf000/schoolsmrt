
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord } from '../types';
import { MonitorPlay, Maximize, Clock, Eye, Plus } from 'lucide-react';
import { getTeacherAssignments, updateStudent } from '../services/storageService';
import { useNavigate } from 'react-router-dom';

interface ClassroomManagerProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance?: PerformanceRecord[];
    onLaunchScreen: () => void;
    onNavigateToAttendance?: () => void;
    onSaveAttendance: (records: AttendanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students = [], 
    onLaunchScreen, 
    currentUser
}) => {
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING' | 'BEHAVIOR'>('TOOLS');
    const [selectedClass, setSelectedClass] = useState('');
    const navigate = useNavigate();

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) {
            getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        }
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) {
            setSelectedClass(uniqueClasses[0] || '');
        }
    }, [uniqueClasses, selectedClass]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MonitorPlay className="text-indigo-600"/> إدارة الفصل: {selectedClass || '...'}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                        className="p-2 border rounded-xl bg-white font-bold text-sm"
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="bg-white p-1 rounded-xl border flex gap-1">
                        <button onClick={() => setActiveTab('TOOLS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TOOLS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-50'}`}>الأدوات</button>
                        <button onClick={() => setActiveTab('SEATING')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SEATING' ? 'bg-indigo-600 text-white shadow' : 'text-gray-50'}`}>المقاعد</button>
                        <button onClick={() => setActiveTab('BEHAVIOR')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'BEHAVIOR' ? 'bg-indigo-600 text-white shadow' : 'text-gray-50'}`}>السلوك</button>
                    </div>

                    <button onClick={onLaunchScreen} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-black shadow-lg">
                        <Maximize size={18}/> شاشة العرض
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden">
                {activeTab === 'SEATING' && (
                    <div className="h-full flex flex-col p-6 overflow-y-auto">
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="w-64 h-12 bg-gray-200 border-b-4 border-gray-300 rounded-lg mx-auto mb-12 flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest text-xs">السبورة</div>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {filteredStudents.map((s) => (
                                    <div key={s.id} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-2 group relative hover:border-indigo-400 transition-all">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold mb-2">
                                            {s.name.charAt(0)}
                                        </div>
                                        <span className="text-[10px] font-bold text-center leading-tight line-clamp-2">{s.name}</span>
                                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => navigate('/followup', { state: { studentId: s.id } })} className="p-1 bg-white rounded-full shadow border text-indigo-600"><Eye size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                                {Array.from({ length: Math.max(0, 15 - filteredStudents.length) }).map((_, i) => (
                                    <div key={i} className="aspect-square border-2 border-dotted border-gray-100 rounded-2xl flex items-center justify-center">
                                        <Plus className="text-gray-200" size={24}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'TOOLS' && (
                    <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-4">
                        <Clock size={64} className="opacity-10"/>
                        <p className="font-bold">الأدوات التفاعلية (مؤقت، قرعة، مجموعات) متوفرة في "شاشة العرض"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;
