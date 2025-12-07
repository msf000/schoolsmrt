
import React, { useState, useEffect } from 'react';
import { CustomTable, SystemUser } from '../types';
import { getCustomTables, deleteCustomTable, updateCustomTable, addCustomTable } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData, getWorkbookStructure } from '../services/excelService';
import { Database, Trash2, RefreshCw, Calendar, Link as LinkIcon, Table, X, ArrowLeft, Loader2, CheckCircle, AlertTriangle, DownloadCloud, Plus, Clipboard } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface CustomTablesViewProps {
    currentUser?: SystemUser | null;
}

const CustomTablesView: React.FC<CustomTablesViewProps> = ({ currentUser }) => {
    const [tables, setTables] = useState<CustomTable[]>([]);
    const [viewingTable, setViewingTable] = useState<CustomTable | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState<1 | 2>(1);
    const [importMethod, setImportMethod] = useState<'URL' | 'FILE'>('URL');
    const [tableName, setTableName] = useState('');
    const [importUrl, setImportUrl] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [fetchedWorkbook, setFetchedWorkbook] = useState<any>(null);
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        if(currentUser) {
            setTables(getCustomTables(currentUser.id));
        }
    }, [currentUser]);

    const resetImportState = () => {
        setImportStep(1); setTableName(''); setImportUrl(''); setImportFile(null);
        setFetchedWorkbook(null); setAvailableSheets([]); setSelectedSheet('');
        setStatus(null); setImportLoading(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('حذف هذا الجدول؟') && currentUser) {
            deleteCustomTable(id);
            setTables(getCustomTables(currentUser.id));
            if (viewingTable?.id === id) setViewingTable(null);
        }
    };

    const handleRefreshData = async (table: CustomTable) => {
        if (!table.sourceUrl || !currentUser) return;
        setRefreshingId(table.id); setStatus(null);
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(table.sourceUrl);
            if (sheetNames.length === 0) throw new Error("الملف فارغ");
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
            const updatedRows = data.map(row => {
                const newRow: any = {};
                table.columns.forEach(col => newRow[col] = row[col]);
                return newRow;
            });

            const updatedTable = { ...table, rows: updatedRows, lastUpdated: new Date().toISOString() };
            updateCustomTable(updatedTable);
            setTables(getCustomTables(currentUser.id));
            if (viewingTable?.id === table.id) setViewingTable(updatedTable);
            setStatus({ type: 'success', message: 'تم التحديث' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setRefreshingId(null);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tableName) return;
        setImportLoading(true); setStatus(null);
        try {
            let structure;
            if (importMethod === 'URL') {
                if (!importUrl) throw new Error("أدخل الرابط");
                structure = await fetchWorkbookStructureUrl(importUrl);
            } else {
                if (!importFile) throw new Error("اختر ملف");
                structure = await getWorkbookStructure(importFile);
            }
            setFetchedWorkbook(structure.workbook);
            setAvailableSheets(structure.sheetNames);
            setSelectedSheet(structure.sheetNames[0]);
            setImportStep(2);
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setImportLoading(false);
        }
    };

    const handleFinalSave = () => {
        if (!fetchedWorkbook || !selectedSheet || !currentUser) return;
        setImportLoading(true);
        try {
            const { headers, data } = getSheetHeadersAndData(fetchedWorkbook, selectedSheet);
            const newTable: CustomTable = {
                id: Date.now().toString(),
                name: tableName,
                createdAt: new Date().toISOString().split('T')[0],
                columns: headers,
                rows: data,
                sourceUrl: importMethod === 'URL' ? importUrl : undefined,
                lastUpdated: new Date().toISOString(),
                teacherId: currentUser.id
            };
            addCustomTable(newTable);
            setTables(getCustomTables(currentUser.id));
            setIsImportModalOpen(false);
            resetImportState();
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in relative">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Database className="text-purple-600" /> الجداول الخاصة</h2>
                    <p className="text-gray-500 mt-2">عرض وإدارة الجداول المخصصة.</p>
                </div>
                {!viewingTable && (
                    <button onClick={() => { resetImportState(); setIsImportModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md font-bold text-sm">
                        <Plus size={18} /> إضافة جدول
                    </button>
                )}
            </div>

            {viewingTable ? (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewingTable(null)} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowLeft size={20} className="text-gray-600"/></button>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{viewingTable.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span><Calendar size={12} className="inline"/> {formatDualDate(viewingTable.createdAt)}</span>
                                    <span><Table size={12} className="inline"/> {viewingTable.rows.length} سجل</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {viewingTable.sourceUrl && (
                                <button onClick={() => handleRefreshData(viewingTable)} disabled={!!refreshingId} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 disabled:opacity-50">
                                    {refreshingId === viewingTable.id ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} تحديث
                                </button>
                            )}
                            <button onClick={(e) => handleDelete(viewingTable.id, e)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                         <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-12 text-center bg-gray-100">#</th>
                                    {viewingTable.columns.map(col => <th key={col} className="p-3 border-b whitespace-nowrap bg-gray-100 font-bold">{col}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {viewingTable.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="p-3 text-center text-gray-400 bg-gray-50/30 border-l">{i + 1}</td>
                                        {viewingTable.columns.map(col => <td key={col} className="p-3 border-l text-gray-700 whitespace-nowrap">{row[col]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tables.map(table => (
                        <div key={table.id} onClick={() => setViewingTable(table)} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Table size={24}/></div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => handleDelete(table.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{table.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{table.rows.length} سجل • {table.columns.length} أعمدة</p>
                        </div>
                    ))}
                    {tables.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl"><p>لا توجد جداول خاصة</p></div>}
                </div>
            )}

            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-bounce-in flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><DownloadCloud className="text-purple-600"/> استيراد جدول</h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {importStep === 1 && (
                                <form onSubmit={handleConnect} className="space-y-4">
                                    <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                                        <button type="button" onClick={() => setImportMethod('URL')} className={`flex-1 py-2 rounded-md text-sm font-bold ${importMethod === 'URL' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>رابط</button>
                                        <button type="button" onClick={() => setImportMethod('FILE')} className={`flex-1 py-2 rounded-md text-sm font-bold ${importMethod === 'FILE' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>ملف</button>
                                    </div>
                                    <div><label className="block text-sm font-bold mb-1">الاسم *</label><input required className="w-full p-2 border rounded-lg" value={tableName} onChange={e => setTableName(e.target.value)}/></div>
                                    {importMethod === 'URL' ? (
                                        <div><label className="block text-sm font-bold mb-1">الرابط *</label><input required className="w-full p-2 border rounded-lg dir-ltr" value={importUrl} onChange={e => setImportUrl(e.target.value)}/></div>
                                    ) : (
                                        <div><label className="block text-sm font-bold mb-1">الملف *</label><input type="file" required accept=".xlsx, .xls" onChange={e => e.target.files && setImportFile(e.target.files[0])} className="w-full"/></div>
                                    )}
                                    <button type="submit" disabled={importLoading} className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold">{importLoading ? 'جاري الاتصال...' : 'التالي'}</button>
                                </form>
                            )}
                            {importStep === 2 && (
                                <div className="space-y-6">
                                    <div><label className="block text-sm font-bold mb-2">اختر ورقة العمل:</label>
                                        {availableSheets.map(sheet => (
                                            <label key={sheet} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedSheet === sheet ? 'bg-purple-50 border-purple-200' : ''}`}>
                                                <input type="radio" name="sheet" value={sheet} checked={selectedSheet === sheet} onChange={() => setSelectedSheet(sheet)}/>
                                                <span className="text-sm font-bold">{sheet}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setImportStep(1)} className="flex-1 py-2 border rounded-lg">عودة</button>
                                        <button onClick={handleFinalSave} disabled={importLoading} className="flex-2 w-full bg-purple-600 text-white py-2 rounded-lg font-bold">{importLoading ? 'جاري الحفظ...' : 'استيراد'}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {status && <div className="fixed bottom-6 right-6 bg-white p-4 rounded-xl shadow-xl border z-50 flex items-center gap-2">{status.type === 'success' ? <CheckCircle className="text-green-500"/> : <AlertTriangle className="text-red-500"/>}<span className="text-sm font-bold">{status.message}</span></div>}
        </div>
    );
};

export default CustomTablesView;
