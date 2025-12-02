import React, { useState, useEffect } from 'react';
import { CustomTable } from '../types';
import { getCustomTables, deleteCustomTable, updateCustomTable, addCustomTable } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData, getWorkbookStructure } from '../services/excelService';
import { Database, Trash2, RefreshCw, Calendar, Link as LinkIcon, Table, X, ArrowLeft, Loader2, CheckCircle, AlertTriangle, CloudDownload, Layers, FileSpreadsheet, ArrowRight, Upload, Plus, Globe, Clipboard } from 'lucide-react';

const CustomTablesView: React.FC = () => {
    const [tables, setTables] = useState<CustomTable[]>([]);
    const [viewingTable, setViewingTable] = useState<CustomTable | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // -- Quick Import State --
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState<1 | 2>(1); // 1: Connect/Upload, 2: Select Sheet
    const [importMethod, setImportMethod] = useState<'URL' | 'FILE'>('URL');
    
    // Step 1 Data
    const [tableName, setTableName] = useState('');
    const [importUrl, setImportUrl] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    
    // Step 2 Data
    const [fetchedWorkbook, setFetchedWorkbook] = useState<any>(null);
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    
    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        setTables(getCustomTables());
    }, []);

    const resetImportState = () => {
        setImportStep(1);
        setTableName('');
        setImportUrl('');
        setImportFile(null);
        setFetchedWorkbook(null);
        setAvailableSheets([]);
        setSelectedSheet('');
        setStatus(null);
        setImportLoading(false);
    };

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
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(table.sourceUrl);
            if (sheetNames.length === 0) throw new Error("الملف فارغ");
            
            // Try to find the original sheet name, otherwise default to first
            // Note: We don't store sheet name currently in CustomTable type, defaulting to first or keeping structure
            // For robust refresh, we assume the structure matches the first sheet or the one used previously.
            // Improvement: Store 'sheetName' in CustomTable type in future.
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
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

    // Step 1: Connect to Source (URL or File) and get Structure
    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tableName) return;
        
        setImportLoading(true);
        setStatus(null);

        try {
            let structure;
            
            if (importMethod === 'URL') {
                if (!importUrl) throw new Error("يرجى إدخال الرابط");
                structure = await fetchWorkbookStructureUrl(importUrl);
            } else {
                if (!importFile) throw new Error("يرجى اختيار ملف");
                structure = await getWorkbookStructure(importFile);
            }

            if (structure.sheetNames.length === 0) throw new Error("لا توجد أوراق عمل في الملف");

            setFetchedWorkbook(structure.workbook);
            setAvailableSheets(structure.sheetNames);
            setSelectedSheet(structure.sheetNames[0]); // Default to first
            setImportStep(2); // Move to next step

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setImportLoading(false);
        }
    };

    // Step 2: Final Save with selected sheet
    const handleFinalSave = () => {
        if (!fetchedWorkbook || !selectedSheet) return;
        
        setImportLoading(true);
        try {
            const { headers, data } = getSheetHeadersAndData(fetchedWorkbook, selectedSheet);

            if (headers.length === 0) throw new Error("ورقة العمل المختارة فارغة");

            const newTable: CustomTable = {
                id: Date.now().toString(),
                name: tableName,
                createdAt: new Date().toISOString().split('T')[0],
                columns: headers,
                rows: data,
                sourceUrl: importMethod === 'URL' ? importUrl : undefined,
                lastUpdated: new Date().toISOString()
            };

            addCustomTable(newTable);
            setTables(getCustomTables());
            setStatus({ type: 'success', message: 'تم حفظ الجدول بنجاح!' });
            setIsImportModalOpen(false);
            resetImportState();

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setImportLoading(false);
        }
    };

    const handlePasteUrl = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setImportUrl(text);
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };
  
    const getUrlType = (link: string) => {
      if (!link) return null;
      if (link.includes('docs.google.com') || link.includes('drive.google.com')) return 'GOOGLE';
      if (link.includes('onedrive.live.com') || link.includes('1drv.ms') || link.includes('sharepoint.com')) return 'ONEDRIVE';
      if (link.includes('dropbox.com')) return 'DROPBOX';
      return 'UNKNOWN';
    };
  
    const urlType = getUrlType(importUrl);

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
                        onClick={() => { resetImportState(); setIsImportModalOpen(true); }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold text-sm"
                    >
                        <Plus size={18} />
                        إضافة جدول جديد
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
                            <p className="text-sm mt-2">اضغط على "إضافة جدول جديد" للبدء</p>
                        </div>
                    )}
                </div>
            )}

            {/* Smart Import Wizard Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-bounce-in flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <CloudDownload className="text-purple-600"/> معالج استيراد الجداول
                            </h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Step Indicator */}
                            <div className="flex items-center mb-6 text-sm">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${importStep === 1 ? 'bg-purple-600 text-white' : 'bg-green-100 text-green-600'}`}>
                                    {importStep === 1 ? '1' : <CheckCircle size={16}/>}
                                </div>
                                <div className={`flex-1 h-1 mx-2 ${importStep === 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${importStep === 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    2
                                </div>
                            </div>

                            {/* STEP 1: Connect / Upload */}
                            {importStep === 1 && (
                                <form onSubmit={handleConnect} className="space-y-4">
                                    <div className="text-center mb-4">
                                        <h4 className="font-bold text-gray-800">مصدر البيانات</h4>
                                        <p className="text-xs text-gray-500">اختر طريقة جلب الملف</p>
                                    </div>
                                    
                                    <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                                        <button type="button" onClick={() => setImportMethod('URL')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${importMethod === 'URL' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>
                                            رابط سحابي
                                        </button>
                                        <button type="button" onClick={() => setImportMethod('FILE')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${importMethod === 'FILE' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>
                                            رفع ملف
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">اسم الجدول *</label>
                                        <input 
                                            autoFocus
                                            required
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="مثال: درجات الشهر الأول"
                                            value={tableName}
                                            onChange={e => setTableName(e.target.value)}
                                        />
                                    </div>

                                    {importMethod === 'URL' ? (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">رابط الملف (OneDrive / Google Sheet) *</label>
                                            <div className="relative">
                                                <input 
                                                    type="url"
                                                    required
                                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dir-ltr text-left font-mono text-sm pl-10"
                                                    placeholder="https://..."
                                                    value={importUrl}
                                                    onChange={e => setImportUrl(e.target.value)}
                                                />
                                                 <button 
                                                    type="button"
                                                    onClick={handlePasteUrl}
                                                    className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                                                    title="لصق الرابط"
                                                >
                                                    <Clipboard size={16}/>
                                                </button>
                                            </div>
                                            
                                            {urlType === 'GOOGLE' && <span className="text-green-600 text-xs font-bold flex items-center gap-1 mt-1"><CheckCircle size={12}/> رابط Google Sheets صالح</span>}
                                            {urlType === 'ONEDRIVE' && <span className="text-blue-600 text-xs font-bold flex items-center gap-1 mt-1"><CheckCircle size={12}/> رابط OneDrive/SharePoint صالح</span>}

                                            <p className="text-xs text-gray-400 mt-1">يدعم روابط المشاركة العامة.</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">اختر الملف (Excel) *</label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 relative">
                                                <input 
                                                    type="file" 
                                                    required 
                                                    accept=".xlsx, .xls, .csv"
                                                    onChange={e => e.target.files && setImportFile(e.target.files[0])}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col items-center">
                                                    <Upload className="text-gray-400 mb-2"/>
                                                    <span className="text-sm text-gray-600 font-bold">{importFile ? importFile.name : 'اضغط لاختيار ملف'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={importLoading}
                                        className="w-full bg-gray-900 hover:bg-black text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                                    >
                                        {importLoading ? <Loader2 className="animate-spin"/> : <ArrowRight size={18}/>}
                                        {importLoading ? 'جاري الاتصال...' : 'التالي: اختيار الورقة'}
                                    </button>
                                </form>
                            )}

                            {/* STEP 2: Select Sheet */}
                            {importStep === 2 && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FileSpreadsheet size={24}/>
                                        </div>
                                        <h4 className="font-bold text-gray-800">تم الاتصال بالملف بنجاح</h4>
                                        <p className="text-xs text-gray-500">يحتوي الملف على {availableSheets.length} أوراق عمل</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">اختر ورقة العمل لاستيرادها:</label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                            {availableSheets.map(sheet => (
                                                <label 
                                                    key={sheet} 
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSheet === sheet ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name="sheetSelector" 
                                                        value={sheet} 
                                                        checked={selectedSheet === sheet} 
                                                        onChange={() => setSelectedSheet(sheet)}
                                                        className="text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className={`text-sm ${selectedSheet === sheet ? 'font-bold text-purple-800' : 'text-gray-700'}`}>{sheet}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setImportStep(1)}
                                            className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50"
                                        >
                                            عودة
                                        </button>
                                        <button 
                                            onClick={handleFinalSave}
                                            disabled={importLoading}
                                            className="flex-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {importLoading ? <Loader2 className="animate-spin"/> : <CheckCircle size={18}/>}
                                            {importLoading ? 'جاري الحفظ...' : 'استيراد البيانات'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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