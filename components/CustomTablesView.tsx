import React, { useState, useEffect } from 'react';
import { CustomTable } from '../types';
import { getCustomTables, deleteCustomTable, updateCustomTable, addCustomTable } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Database, Trash2, Eye, RefreshCw, Calendar, Link as LinkIcon, Table, X, ArrowLeft, Loader2, CheckCircle, AlertTriangle, CloudDownload, Plus } from 'lucide-react';

const CustomTablesView: React.FC = () => {
    const [tables, setTables] = useState<CustomTable[]>([]);
    const [viewingTable, setViewingTable] = useState<CustomTable | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // -- Quick Import State --
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importConfig, setImportConfig] = useState({ name: '', url: '' });
    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        setTables(getCustomTables());
    }, []);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
            deleteCustomTable(id);
            setTables(getCustomTables());
            if (viewingTable?.id === id) setViewingTable(null);
        }
    };

    const handleRefreshData = async (table: CustomTable) => {
        if (!table.sourceUrl) return;
        
        setRefreshingId(table.id);
        setStatus(null);
        
        try {
            // Fetch updated data from URL
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(table.sourceUrl);
            if (sheetNames.length === 0) throw new Error("الملف فارغ");
            
            // Assume first sheet for simplicity
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
            // Update rows based on saved columns
            // Warning: If source columns changed, this might miss data. 
            // Ideally we stick to original columns or update columns too.
            // Here we update columns to match new data if needed or stick to old.
            // Let's stick to simple refresh: existing columns + new rows
            const updatedRows = data.map(row => {
                const newRow: any = {};
                table.columns.forEach(col => newRow[col] = row[col]);
                return newRow;
            });

            const updatedTable: CustomTable = {
                ...table,
                rows: updatedRows,
                lastUpdated: new Date().toISOString()
            };

            updateCustomTable(updatedTable);
            
            setTables(getCustomTables());
            if (viewingTable?.id === table.id) setViewingTable(updatedTable);
            
            setStatus({ type: 'success', message: 'تم تحديث البيانات بنجاح من المصدر' });
        } catch (error: any) {
            setStatus({ type: 'error', message: 'فشل التحديث: ' + error.message });
        } finally {
            setRefreshingId(null);
        }
    };

    const handleQuickImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importConfig.name || !importConfig.url) return;

        setImportLoading(true);
        setStatus(null);

        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(importConfig.url);
            
            if (sheetNames.length === 0) throw new Error("لم يتم العثور على أوراق عمل في الملف");
            
            // Automatically select the first sheet
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);

            if (headers.length === 0) throw new Error("ورقة العمل فارغة أو لا تحتوي على عناوين");

            const newTable: CustomTable = {
                id: Date.now().toString(),
                name: importConfig.name,
                createdAt: new Date().toISOString().split('T')[0],
                columns: headers,
                rows: data,
                sourceUrl: importConfig.url,
                lastUpdated: new Date().toISOString()
            };

            addCustomTable(newTable);
            setTables(getCustomTables());
            
            setStatus({ type: 'success', message: 'تم استيراد الجدول بنجاح!' });
            setIsImportModalOpen(false);
            setImportConfig({ name: '', url: '' });

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
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Database className="text-purple-600" />
                        الجداول الخاصة
                    </h2>
                    <p className="text-gray-500 mt-2">عرض وإدارة الجداول التي تم استيرادها بشكل مخصص.</p>
                </div>
                {!viewingTable && (
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold text-sm"
                    >
                        <CloudDownload size={18} />
                        استيراد سريع (OneDrive)
                    </button>
                )}
            </div>

            {viewingTable ? (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewingTable(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <ArrowLeft size={20} className="text-gray-600"/>
                            </button>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{viewingTable.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Calendar size={12}/> تم الإنشاء: {viewingTable.createdAt}</span>
                                    <span className="flex items-center gap-1"><Table size={12}/> {viewingTable.rows.length} سجل</span>
                                    {viewingTable.lastUpdated && <span className="text-green-600">تم التحديث: {new Date(viewingTable.lastUpdated).toLocaleString('ar-EG')}</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                             {viewingTable.sourceUrl && (
                                <button 
                                    onClick={() => handleRefreshData(viewingTable)} 
                                    disabled={!!refreshingId}
                                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 disabled:opacity-50"
                                >
                                    {refreshingId === viewingTable.id ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                                    تحديث البيانات
                                </button>
                            )}
                            <button onClick={(e) => handleDelete(viewingTable.id, e)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-0">
                         <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-12 text-center bg-gray-100">#</th>
                                    {viewingTable.columns.map(col => (
                                        <th key={col} className="p-3 border-b whitespace-nowrap bg-gray-100 font-bold">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {viewingTable.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="p-3 text-center text-gray-400 bg-gray-50/30 border-l">{i + 1}</td>
                                        {viewingTable.columns.map(col => (
                                            <td key={col} className="p-3 border-l text-gray-700 whitespace-nowrap">{row[col]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tables.length > 0 ? tables.map(table => (
                        <div 
                            key={table.id} 
                            onClick={() => setViewingTable(table)}
                            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                    <Table size={24}/>
                                </div>
                                <div className="flex gap-2">
                                     {table.sourceUrl && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRefreshData(table); }}
                                            disabled={!!refreshingId}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full disabled:opacity-50" 
                                            title="تحديث من الرابط"
                                        >
                                            {refreshingId === table.id ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => handleDelete(table.id, e)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{table.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{table.rows.length} سجل • {table.columns.length} أعمدة</p>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-2 rounded">
                                <Calendar size={12}/>
                                <span>تاريخ: {table.createdAt}</span>
                                {table.sourceUrl && (
                                    <>
                                        <span className="mx-1">•</span>
                                        <LinkIcon size={12} className="text-blue-500"/>
                                        <span className="text-blue-600">مرتبط برابط</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Database size={48} className="mx-auto mb-4 opacity-20"/>
                            <p className="text-lg font-medium">لا توجد جداول خاصة محفوظة</p>
                            <p className="text-sm mt-2">اضغط على "استيراد سريع" لإضافة جدول من رابط OneDrive أو Google Sheets</p>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-bounce-in">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <CloudDownload className="text-purple-600"/> استيراد سريع (سحابي)
                            </h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={20}/>
                            </button>
                        </div>
                        <form onSubmit={handleQuickImport} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم الجدول</label>
                                <input 
                                    autoFocus
                                    required
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="مثال: درجات الشهر الأول"
                                    value={importConfig.name}
                                    onChange={e => setImportConfig({...importConfig, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">رابط الملف (OneDrive / Google Sheet)</label>
                                <input 
                                    type="url"
                                    required
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dir-ltr text-left font-mono text-sm"
                                    placeholder="https://..."
                                    value={importConfig.url}
                                    onChange={e => setImportConfig({...importConfig, url: e.target.value})}
                                />
                                <p className="text-xs text-gray-400 mt-1">يدعم روابط المشاركة من ون درايف و جوجل شيت.</p>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={importLoading}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {importLoading ? <Loader2 className="animate-spin"/> : <CloudDownload size={18}/>}
                                    {importLoading ? 'جاري جلب البيانات...' : 'استيراد وحفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {status && (
                <div className={`fixed bottom-6 left-6 right-6 md:right-auto md:w-96 p-4 rounded-xl shadow-2xl border flex items-center gap-3 z-50 animate-bounce-in ${status.type === 'success' ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}`}>
                    {status.type === 'success' ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>}
                    <div>
                        <h4 className="font-bold">{status.type === 'success' ? 'تمت العملية' : 'تنبيه'}</h4>
                        <p className="text-sm opacity-90">{status.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomTablesView;