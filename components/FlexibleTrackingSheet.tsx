
import React, { useState, useEffect, useMemo } from 'react';
import { Student, TrackingSheet, TrackingColumn, SystemUser } from '../types';
import { getTrackingSheets, saveTrackingSheet, deleteTrackingSheet, getStudents } from '../services/storageService';
import { Plus, Trash2, Save, Printer, ArrowLeft, LayoutGrid, Star, Table, Download, Calculator, X, ChevronRight, CheckSquare, Type, ListPlus, FileSpreadsheet } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import * as XLSX from 'xlsx';

const FlexibleTrackingSheet: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
    const [sheets, setSheets] = useState<TrackingSheet[]>([]);
    const [activeSheet, setActiveSheet] = useState<TrackingSheet | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
    const [newColForm, setNewColForm] = useState<{title: string, type: TrackingColumn['type']}>({ title: '', type: 'RATING' });

    useEffect(() => {
        setSheets(getTrackingSheets(currentUser.id));
        setStudents(getStudents());
    }, [currentUser, view]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const createNew = () => {
        const newSheet: TrackingSheet = {
            id: `flex_${Date.now()}`,
            title: 'سجل رصد مخصص',
            subject: 'نشاط',
            className: uniqueClasses[0] || '',
            teacherId: currentUser.id,
            createdAt: new Date().toISOString(),
            columns: [{ id: 'col_1', title: 'المشاركة', type: 'RATING' }],
            scores: {}
        };
        setActiveSheet(newSheet); 
        setSelectedClass(newSheet.className); 
        setView('EDITOR');
    };

    const handleUpdateScore = (studentId: string, colId: string, val: any) => {
        if (!activeSheet) return;
        const newScores = { ...activeSheet.scores };
        if (!newScores[studentId]) newScores[studentId] = {};
        newScores[studentId][colId] = val;
        setActiveSheet({ ...activeSheet, scores: newScores });
    };

    const handleAddColumn = () => {
        if (!activeSheet || !newColForm.title) return;
        const newCol: TrackingColumn = {
            id: `col_${Date.now()}`,
            title: newColForm.title,
            type: newColForm.type
        };
        setActiveSheet({ ...activeSheet, columns: [...activeSheet.columns, newCol] });
        setNewColForm({ title: '', type: 'RATING' });
        setIsAddColModalOpen(false);
    };

    const handleDeleteColumn = (id: string) => {
        if (!activeSheet) return;
        setActiveSheet({ ...activeSheet, columns: activeSheet.columns.filter(c => c.id !== id) });
    };

    const handleExportExcel = () => {
        if (!activeSheet) return;
        const filtered = students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name));
        const data = filtered.map((s, idx) => {
            const row: any = { 'م': idx + 1, 'الاسم': s.name };
            activeSheet.columns.forEach(col => {
                row[col.title] = activeSheet.scores[s.id]?.[col.id] || '-';
            });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل رصد");
        XLSX.writeFile(wb, `${activeSheet.title}_${selectedClass}.xlsx`);
    };

    const handleSave = () => {
        if (activeSheet) { 
            saveTrackingSheet(activeSheet); 
            setSheets(getTrackingSheets(currentUser.id)); 
            setView('LIST'); 
            alert('تم حفظ السجل بنجاح');
        }
    };

    const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar')), [students, selectedClass]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            {view === 'LIST' ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800">السجلات المرنة</h2>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">صمم سجل رصد لأي نشاط أو مهمة</p>
                        </div>
                        <button onClick={createNew} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                            <Plus size={20}/> إنشاء سجل جديد
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sheets.map(sheet => (
                            <div key={sheet.id} onClick={() => { setActiveSheet(sheet); setSelectedClass(sheet.className); setView('EDITOR'); }} className="bg-white p-8 rounded-[2.5rem] border shadow-sm cursor-pointer hover:border-indigo-500 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                                <div className="flex justify-between mb-6">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><LayoutGrid size={24}/></div>
                                    <button onClick={(e) => { e.stopPropagation(); if(confirm('حذف السجل؟')){ deleteTrackingSheet(sheet.id); setSheets(getTrackingSheets(currentUser.id)); } }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </div>
                                <h3 className="font-black text-xl text-slate-800 mb-2">{sheet.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
                                    <span>{sheet.className}</span>
                                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                    <span>{sheet.columns.length} أعمدة رصد</span>
                                </div>
                            </div>
                        ))}
                        {sheets.length === 0 && (
                            <div className="col-span-full py-24 text-center text-slate-300">
                                <Table size={80} className="mx-auto mb-4 opacity-10"/>
                                <p className="font-black text-xl">لا توجد سجلات مخصصة بعد</p>
                            </div>
                        )}
                    </div>
                </>
            ) : activeSheet && (
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[3rem] border shadow-2xl relative">
                    <div className="p-6 border-b flex flex-col lg:flex-row justify-between items-center bg-gray-50/50 gap-4 shrink-0">
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            <button onClick={() => setView('LIST')} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-indigo-50 text-slate-400 transition-colors"><ArrowLeft size={20}/></button>
                            <div className="flex-1">
                                <input className="font-black text-2xl bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full" value={activeSheet.title} onChange={e => setActiveSheet({...activeSheet, title: e.target.value})} />
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">تاريخ الإنشاء: {formatDualDate(activeSheet.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            <select className="flex-1 md:flex-none p-3 border rounded-2xl text-xs font-black bg-white outline-none shadow-sm min-w-[150px]" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setActiveSheet({...activeSheet, className: e.target.value})}}>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={handleExportExcel} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100" title="تصدير Excel"><FileSpreadsheet size={20}/></button>
                            <button onClick={() => setIsAddColModalOpen(true)} className="px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-xs hover:bg-indigo-100 transition-all border border-indigo-100 flex items-center gap-2"><ListPlus size={18}/> عمود جديد</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-indigo-700"><Save size={18}/> حفظ السجل</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] font-black text-[11px] text-slate-400 uppercase tracking-widest sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="p-5 border-l border-gray-50 w-16 text-center">م</th>
                                    <th className="p-5 border-l border-gray-50 min-w-[250px] sticky right-0 bg-[#F8FAFC] z-40 shadow-sm text-slate-800">اسم الطالب</th>
                                    {activeSheet.columns.map(col => (
                                        <th key={col.id} className="p-5 border-l border-gray-50 text-center min-w-[150px] group relative">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-slate-700">{col.title}</span>
                                                <span className="text-[8px] px-2 py-0.5 bg-white rounded-full text-slate-400 border">{col.type}</span>
                                            </div>
                                            <button onClick={()=>handleDeleteColumn(col.id)} className="absolute top-1 left-1 text-red-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"><X size={12}/></button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStudents.map((s, i) => (
                                    <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors h-16">
                                        <td className="p-4 border-l border-gray-50 text-center text-xs text-slate-300 font-mono">{i+1}</td>
                                        <td className="p-4 border-l border-gray-50 font-black text-slate-700 sticky right-0 bg-white z-10 shadow-sm">{s.name}</td>
                                        {activeSheet.columns.map(col => (
                                            <td key={col.id} className="p-0 border-l border-gray-50 h-full">
                                                {col.type === 'RATING' ? (
                                                    <div className="flex justify-center items-center gap-1 h-full">
                                                        {[1,2,3,4,5].map(v => (
                                                            <Star 
                                                                key={v} 
                                                                size={18} 
                                                                className={`cursor-pointer transition-all active:scale-125 ${v <= (activeSheet.scores[s.id]?.[col.id] || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-100 hover:text-yellow-200'}`} 
                                                                onClick={() => handleUpdateScore(s.id, col.id, v)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : col.type === 'CHECKBOX' ? (
                                                    <div className="flex justify-center items-center h-full">
                                                        <input type="checkbox" className="w-6 h-6 accent-indigo-600 rounded-lg cursor-pointer" checked={!!activeSheet.scores[s.id]?.[col.id]} onChange={e => handleUpdateScore(s.id, col.id, e.target.checked)}/>
                                                    </div>
                                                ) : (
                                                    <input 
                                                        className="w-full h-full bg-transparent text-center outline-none focus:bg-indigo-50/50 font-bold text-sm text-indigo-900 border-none px-4" 
                                                        value={activeSheet.scores[s.id]?.[col.id] || ''} 
                                                        onChange={e => handleUpdateScore(s.id, col.id, e.target.value)} 
                                                        placeholder="رصد..."
                                                    />
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

            {/* Add Column Modal */}
            {isAddColModalOpen && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800">إضافة عمود رصد جديد</h3>
                            <button onClick={() => setIsAddColModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={28}/></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">عنوان العمود</label>
                                <input 
                                    className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 transition-all"
                                    placeholder="مثلاً: التميز، المشاركة، إحضار الكتاب..."
                                    value={newColForm.title}
                                    onChange={e => setNewColForm({...newColForm, title: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">نوع الرصد</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <TypeBtn label="نص" active={newColForm.type === 'TEXT'} onClick={()=>setNewColForm({...newColForm, type: 'TEXT'})} icon={Type}/>
                                    <TypeBtn label="تقييم" active={newColForm.type === 'RATING'} onClick={()=>setNewColForm({...newColForm, type: 'RATING'})} icon={Star}/>
                                    <TypeBtn label="اختيار" active={newColForm.type === 'CHECKBOX'} onClick={()=>setNewColForm({...newColForm, type: 'CHECKBOX'})} icon={CheckSquare}/>
                                </div>
                            </div>
                            <button onClick={handleAddColumn} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">إدراج العمود في السجل</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TypeBtn = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'}`}>
        <Icon size={20}/>
        <span className="text-[10px] font-black">{label}</span>
    </button>
);

export default FlexibleTrackingSheet;
