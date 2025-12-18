
import React, { useState, useEffect, useMemo } from 'react';
import { Student, TrackingSheet, TrackingColumn, SystemUser } from '../types';
import { getTrackingSheets, saveTrackingSheet, deleteTrackingSheet, getStudents } from '../services/storageService';
import { Plus, Trash2, Save, Printer, ArrowLeft, LayoutGrid, Star, Table, Download, Calculator } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import * as XLSX from 'xlsx';

const FlexibleTrackingSheet: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
    const [sheets, setSheets] = useState<TrackingSheet[]>([]);
    const [activeSheet, setActiveSheet] = useState<TrackingSheet | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClass, setSelectedClass] = useState('');

    useEffect(() => {
        setSheets(getTrackingSheets(currentUser.id));
        setStudents(getStudents());
    }, [currentUser]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const createNew = () => {
        const newSheet: TrackingSheet = {
            id: Date.now().toString(),
            title: 'سجل رصد جديد',
            subject: 'عام',
            className: uniqueClasses[0] || '',
            teacherId: currentUser.id,
            createdAt: new Date().toISOString(),
            columns: [{ id: '1', title: 'المشاركة', type: 'RATING' }, { id: '2', title: 'ملاحظة', type: 'TEXT' }],
            scores: {}
        };
        setActiveSheet(newSheet); setSelectedClass(newSheet.className); setView('EDITOR');
    };

    const handleUpdateScore = (studentId: string, colId: string, val: any) => {
        if (!activeSheet) return;
        const newScores = { ...activeSheet.scores };
        if (!newScores[studentId]) newScores[studentId] = {};
        newScores[studentId][colId] = val;
        setActiveSheet({ ...activeSheet, scores: newScores });
    };

    const handleSave = () => {
        if (activeSheet) { saveTrackingSheet(activeSheet); setSheets(getTrackingSheets(currentUser.id)); setView('LIST'); }
    };

    const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name)), [students, selectedClass]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' ? (
                <>
                    <div className="flex justify-between items-center mb-8">
                        <div><h2 className="text-2xl font-bold text-gray-800">السجلات المرنة</h2><p className="text-sm text-gray-500">صمم سجلات رصد مخصصة للمتابعة اليومية</p></div>
                        <button onClick={createNew} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus/> سجل جديد</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {sheets.map(sheet => (
                            <div key={sheet.id} onClick={() => { setActiveSheet(sheet); setSelectedClass(sheet.className); setView('EDITOR'); }} className="bg-white p-6 rounded-2xl border shadow-sm cursor-pointer hover:border-purple-500 transition-all group">
                                <div className="flex justify-between mb-4"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Table size={20}/></div><button onClick={(e) => { e.stopPropagation(); deleteTrackingSheet(sheet.id); setSheets(getTrackingSheets(currentUser.id)); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button></div>
                                <h3 className="font-bold text-gray-800 mb-1">{sheet.title}</h3>
                                <p className="text-xs text-gray-400">{sheet.className} • {formatDualDate(sheet.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                </>
            ) : activeSheet && (
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                            <input className="font-bold text-lg bg-transparent border-b border-transparent focus:border-purple-500 outline-none" value={activeSheet.title} onChange={e => setActiveSheet({...activeSheet, title: e.target.value})} />
                        </div>
                        <div className="flex gap-2">
                            <select className="p-2 border rounded-lg text-sm bg-white font-bold" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setActiveSheet({...activeSheet, className: e.target.value})}}>{uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={18}/> حفظ</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-100 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border w-12 text-center bg-gray-100">#</th>
                                    <th className="p-3 border min-w-[200px] sticky right-0 bg-gray-100">الطالب</th>
                                    {activeSheet.columns.map(col => <th key={col.id} className="p-3 border text-center min-w-[120px]">{col.title}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((s, i) => (
                                    <tr key={s.id} className="hover:bg-gray-50 border-b">
                                        <td className="p-3 border text-center text-gray-400">{i+1}</td>
                                        <td className="p-3 border font-bold text-gray-800 sticky right-0 bg-white">{s.name}</td>
                                        {activeSheet.columns.map(col => (
                                            <td key={col.id} className="p-2 border text-center">
                                                {col.type === 'RATING' ? (
                                                    <div className="flex justify-center gap-1">
                                                        {[1,2,3,4,5].map(v => <Star key={v} size={14} className={`cursor-pointer ${v <= (activeSheet.scores[s.id]?.[col.id] || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} onClick={() => handleUpdateScore(s.id, col.id, v)}/>)}
                                                    </div>
                                                ) : col.type === 'CHECKBOX' ? (
                                                    <input type="checkbox" className="w-5 h-5 accent-purple-600" checked={!!activeSheet.scores[s.id]?.[col.id]} onChange={e => handleUpdateScore(s.id, col.id, e.target.checked)}/>
                                                ) : (
                                                    <input className="w-full bg-transparent text-center outline-none" value={activeSheet.scores[s.id]?.[col.id] || ''} onChange={e => handleUpdateScore(s.id, col.id, e.target.value)} placeholder="..."/>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlexibleTrackingSheet;
