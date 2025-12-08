
import React, { useState, useEffect, useMemo } from 'react';
import { Student, TrackingSheet, TrackingColumn, SystemUser, Subject } from '../types';
import { getTrackingSheets, saveTrackingSheet, deleteTrackingSheet, getStudents, getSubjects } from '../services/storageService';
import { Plus, Trash2, Edit2, Save, Printer, ArrowLeft, MoreVertical, LayoutGrid, CheckSquare, Hash, Type, Table, Star } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface FlexibleTrackingSheetProps {
    currentUser: SystemUser;
}

const FlexibleTrackingSheet: React.FC<FlexibleTrackingSheetProps> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
    const [sheets, setSheets] = useState<TrackingSheet[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Editor State
    const [activeSheet, setActiveSheet] = useState<TrackingSheet | null>(null);
    const [tempTitle, setTempTitle] = useState('');
    const [tempClass, setTempClass] = useState('');
    const [tempSubject, setTempSubject] = useState('');

    useEffect(() => {
        setSheets(getTrackingSheets(currentUser.id));
        // Get only teacher's students or linked class students
        setStudents(getStudents().filter(s => s.schoolId === currentUser.schoolId || s.createdById === currentUser.id));
        setSubjects(getSubjects(currentUser.id));
    }, [currentUser]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const createNewSheet = () => {
        const newSheet: TrackingSheet = {
            id: Date.now().toString(),
            title: 'سجل جديد',
            subject: subjects.length > 0 ? subjects[0].name : '',
            className: uniqueClasses.length > 0 ? uniqueClasses[0] : '',
            teacherId: currentUser.id,
            createdAt: new Date().toISOString(),
            columns: [
                { id: 'c1', title: 'مشاركة 1', type: 'NUMBER', maxScore: 5 },
                { id: 'c2', title: 'واجب', type: 'CHECKBOX' }
            ],
            scores: {}
        };
        setActiveSheet(newSheet);
        setTempTitle(newSheet.title);
        setTempClass(newSheet.className);
        setTempSubject(newSheet.subject);
        setView('EDITOR');
    };

    const handleEditSheet = (sheet: TrackingSheet) => {
        setActiveSheet(sheet);
        setTempTitle(sheet.title);
        setTempClass(sheet.className);
        setTempSubject(sheet.subject);
        setView('EDITOR');
    };

    const handleDeleteSheet = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('حذف هذا السجل نهائياً؟')) {
            deleteTrackingSheet(id);
            setSheets(getTrackingSheets(currentUser.id));
        }
    };

    const handleSaveSheet = () => {
        if (!activeSheet) return;
        const updated = {
            ...activeSheet,
            title: tempTitle,
            className: tempClass,
            subject: tempSubject
        };
        saveTrackingSheet(updated);
        setSheets(getTrackingSheets(currentUser.id));
        setView('LIST');
        setActiveSheet(null);
    };

    // --- EDITOR LOGIC ---
    const addColumn = () => {
        if (!activeSheet) return;
        const newCol: TrackingColumn = {
            id: 'col_' + Date.now(),
            title: 'عمود جديد',
            type: 'NUMBER',
            maxScore: 10
        };
        setActiveSheet({ ...activeSheet, columns: [...activeSheet.columns, newCol] });
    };

    const updateColumn = (id: string, updates: Partial<TrackingColumn>) => {
        if (!activeSheet) return;
        const newCols = activeSheet.columns.map(c => c.id === id ? { ...c, ...updates } : c);
        setActiveSheet({ ...activeSheet, columns: newCols });
    };

    const deleteColumn = (id: string) => {
        if (!activeSheet || !confirm('حذف العمود؟')) return;
        setActiveSheet({ ...activeSheet, columns: activeSheet.columns.filter(c => c.id !== id) });
    };

    const updateScore = (studentId: string, colId: string, val: any) => {
        if (!activeSheet) return;
        const newScores = { ...activeSheet.scores };
        if (!newScores[studentId]) newScores[studentId] = {};
        newScores[studentId][colId] = val;
        setActiveSheet({ ...activeSheet, scores: newScores });
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => s.className === tempClass).sort((a,b) => a.name.localeCompare(b.name));
    }, [students, tempClass]);

    const renderRatingStars = (studentId: string, colId: string, currentVal: number) => {
        return (
            <div className="flex justify-center items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button 
                        key={star} 
                        onClick={() => updateScore(studentId, colId, star === currentVal ? 0 : star)}
                        className={`transition-transform hover:scale-110 ${star <= (currentVal || 0) ? 'text-yellow-400' : 'text-gray-200'}`}
                    >
                        <Star size={16} fill={star <= (currentVal || 0) ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Table className="text-purple-600"/> سجلات الرصد المرنة
                            </h2>
                            <p className="text-sm text-gray-500">سجلات خاصة منفصلة عن النظام الرئيسي (مثل: سجل القرآن، متابعة المشاريع...)</p>
                        </div>
                        <button onClick={createNewSheet} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md">
                            <Plus size={18}/> سجل جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                        {sheets.map(sheet => (
                            <div key={sheet.id} onClick={() => handleEditSheet(sheet)} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                                        <LayoutGrid size={24}/>
                                    </div>
                                    <button onClick={(e) => handleDeleteSheet(sheet.id, e)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{sheet.title}</h3>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p>المادة: <span className="font-bold text-purple-700">{sheet.subject}</span></p>
                                    <p>الفصل: <span className="font-bold">{sheet.className}</span></p>
                                    <p>تاريخ الإنشاء: {formatDualDate(sheet.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                        {sheets.length === 0 && (
                            <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <p>لا توجد سجلات خاصة. ابدأ بإنشاء واحد.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'EDITOR' && activeSheet && (
                <div className="flex flex-col h-full">
                    <div className="bg-white p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm z-10">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                            <input className="font-bold text-lg text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 outline-none w-48 md:w-64" value={tempTitle} onChange={e => setTempTitle(e.target.value)} />
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <select className="p-2 border rounded text-sm bg-gray-50" value={tempSubject} onChange={e => setTempSubject(e.target.value)}>
                                <option value="">المادة...</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            <select className="p-2 border rounded text-sm bg-gray-50" value={tempClass} onChange={e => setTempClass(e.target.value)}>
                                <option value="">الفصل...</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="h-6 w-[1px] bg-gray-300 mx-2"></div>
                            <button onClick={addColumn} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-100 flex items-center gap-1"><Plus size={14}/> عمود</button>
                            <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-200 flex items-center gap-1"><Printer size={14}/> طباعة</button>
                            <button onClick={handleSaveSheet} className="bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1 shadow"><Save size={14}/> حفظ</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-white shadow-inner custom-scrollbar relative">
                        <table className="w-full text-right border-collapse text-sm min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="p-3 border w-12 text-center bg-gray-100">#</th>
                                    <th className="p-3 border w-48 bg-gray-100 sticky right-0 z-30 shadow-md">اسم الطالب</th>
                                    {activeSheet.columns.map((col, idx) => (
                                        <th key={col.id} className="p-2 border min-w-[150px] relative group">
                                            <div className="flex flex-col gap-1">
                                                <input className="bg-transparent font-bold outline-none w-full text-center" value={col.title} onChange={e => updateColumn(col.id, { title: e.target.value })} />
                                                <div className="flex justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <select className="text-[10px] bg-white border rounded" value={col.type} onChange={e => updateColumn(col.id, { type: e.target.value as any })}>
                                                        <option value="NUMBER">رقم</option>
                                                        <option value="TEXT">نص</option>
                                                        <option value="CHECKBOX">صح/خطأ</option>
                                                        <option value="RATING">تقييم (نجوم)</option>
                                                    </select>
                                                    {col.type === 'NUMBER' && (
                                                        <input className="w-8 text-[10px] text-center border rounded" value={col.maxScore} onChange={e => updateColumn(col.id, { maxScore: Number(e.target.value) })} placeholder="Max"/>
                                                    )}
                                                    <button onClick={() => deleteColumn(col.id)} className="text-red-500 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, i) => (
                                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors border-b">
                                        <td className="p-3 border text-center text-gray-500 bg-gray-50">{i + 1}</td>
                                        <td className="p-3 border font-bold text-gray-800 bg-white sticky right-0 z-10 shadow-sm">{student.name}</td>
                                        {activeSheet.columns.map(col => {
                                            const val = activeSheet.scores[student.id]?.[col.id];
                                            return (
                                                <td key={col.id} className="p-0 border relative">
                                                    {col.type === 'CHECKBOX' ? (
                                                        <div className="flex justify-center items-center h-full py-2">
                                                            <input 
                                                                type="checkbox" 
                                                                className="w-5 h-5 cursor-pointer accent-purple-600"
                                                                checked={!!val} 
                                                                onChange={e => updateScore(student.id, col.id, e.target.checked)} 
                                                            />
                                                        </div>
                                                    ) : col.type === 'RATING' ? (
                                                        <div className="h-full py-2">
                                                            {renderRatingStars(student.id, col.id, val)}
                                                        </div>
                                                    ) : col.type === 'NUMBER' ? (
                                                        <input 
                                                            type="number" 
                                                            className="w-full h-full p-2 text-center outline-none bg-transparent focus:bg-blue-50" 
                                                            value={val || ''} 
                                                            onChange={e => updateScore(student.id, col.id, e.target.value)}
                                                            placeholder={`/${col.maxScore || 10}`}
                                                        />
                                                    ) : (
                                                        <input 
                                                            className="w-full h-full p-2 text-right outline-none bg-transparent focus:bg-blue-50" 
                                                            value={val || ''} 
                                                            onChange={e => updateScore(student.id, col.id, e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && <tr><td colSpan={activeSheet.columns.length + 2} className="p-10 text-center text-gray-400">اختر فصلاً لعرض الطلاب</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlexibleTrackingSheet;
