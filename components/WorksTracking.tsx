import React, { useState, useEffect } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, WorksColumnConfig, ExternalSource } from '../types';
import { getWorksConfig, saveWorksConfig } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Settings, RefreshCw, CheckCircle, ExternalLink, Loader2, Table, AlertCircle } from 'lucide-react';

interface WorksTrackingProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
}

// Helper to extract label and max score from header
const extractHeaderMetadata = (header: string): { label: string, maxScore: number } => {
    // Example: "Quiz 1 (10)" -> label: "Quiz 1", maxScore: 10
    // Example: "HW 5" -> label: "HW 5", maxScore: 10 (default)
    let maxScore = 10;
    let label = header;

    const match = header.match(/\((\d+)\)/);
    if (match) {
        maxScore = parseInt(match[1]);
        label = header.replace(/\(\d+\)/, '').trim();
    }
    return { label, maxScore };
};

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, onAddPerformance }) => {
    // State
    const [selectedSubject, setSelectedSubject] = useState('رياضيات');
    const [activeTab, setActiveTab] = useState<PerformanceCategory>('ACTIVITY');
    const [columnsConfig, setColumnsConfig] = useState<WorksColumnConfig[]>([]);
    
    // Grid Data: StudentID -> ColumnKey -> { score, url }
    const [gridData, setGridData] = useState<Record<string, Record<string, { score: string, url?: string }>>>({});
    
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Auto-Gen State
    const [isGenerating, setIsGenerating] = useState(false);
    const [sources, setSources] = useState<ExternalSource[]>([]); 
    
    const [autoGenSourceId, setAutoGenSourceId] = useState('');
    const [autoGenSheet, setAutoGenSheet] = useState('');
    const [currentWorkbook, setCurrentWorkbook] = useState<any>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [manualUrl, setManualUrl] = useState('');

    useEffect(() => {
        // Load config
        const config = getWorksConfig(activeTab);
        setColumnsConfig(config);
    }, [activeTab]);

    useEffect(() => {
        // Build grid data from performance records
        const newGrid: Record<string, Record<string, { score: string, url?: string }>> = {};
        
        performance.forEach(p => {
            if (p.category === activeTab && p.subject === selectedSubject && p.notes) {
                if (!newGrid[p.studentId]) newGrid[p.studentId] = {};
                newGrid[p.studentId][p.notes] = {
                    score: p.score.toString(),
                    url: p.url
                };
            }
        });
        setGridData(newGrid);
    }, [performance, activeTab, selectedSubject]);


    const handleScoreChange = (studentId: string, colKey: string, val: string) => {
        setGridData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [colKey]: { ...prev[studentId]?.[colKey], score: val }
            }
        }));
    };

    const handleSaveGrid = () => {
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        students.forEach(student => {
            columnsConfig.forEach(col => {
                if (col.isVisible) {
                    const cellData = gridData[student.id]?.[col.key];
                    if (cellData && cellData.score !== '' && cellData.score !== undefined) {
                         const val = parseFloat(cellData.score);
                         if (!isNaN(val)) {
                            // Find existing to preserve ID if needed, or just upsert
                            const existing = performance.find(p => 
                                p.studentId === student.id && 
                                p.category === activeTab && 
                                p.subject === selectedSubject && 
                                p.notes === col.key
                            );

                            recordsToSave.push({
                                id: existing ? existing.id : `${Date.now()}-${Math.random()}`,
                                studentId: student.id,
                                subject: selectedSubject,
                                title: col.label,
                                category: activeTab,
                                score: val,
                                maxScore: col.maxScore,
                                date: existing ? existing.date : today,
                                notes: col.key,
                                url: cellData.url
                            });
                         }
                    }
                }
            });
        });

        onAddPerformance(recordsToSave);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };

    // --- AUTO GEN LOGIC ---
    const handleConnectSource = async () => {
        if (!manualUrl) return;
        setIsGenerating(true);
        try {
            const res = await fetchWorkbookStructureUrl(manualUrl);
            setCurrentWorkbook(res.workbook);
            setSheetNames(res.sheetNames);
            if(res.sheetNames.length > 0) setAutoGenSheet(res.sheetNames[0]);
            setAutoGenSourceId('temp-source'); // Mock ID
            setSources([{id: 'temp-source', name: 'Temporary Source', url: manualUrl}]);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoGenColumns = async () => {
        if (!autoGenSourceId || !autoGenSheet) return;
        const source = sources.find(s => s.id === autoGenSourceId);
        if (!source) return;

        setIsGenerating(true);
        try {
            // 1. Fetch headers and DATA from selected sheet
            let workbook = currentWorkbook;
            if(!workbook) {
                 const res = await fetchWorkbookStructureUrl(source.url);
                 workbook = res.workbook;
            }
            
            const { headers, data } = getSheetHeadersAndData(workbook, autoGenSheet);
            
            // 2. Filter out non-grade headers
            const excludeKeywords = ['name', 'id', 'student', 'phone', 'email', 'mobile', 'اسم', 'هوية', 'سجل', 'جوال', 'صف', 'فصل'];
            const gradeHeaders = headers.filter(h => 
                !excludeKeywords.some(kw => h.toLowerCase().includes(kw))
            );

            if (gradeHeaders.length === 0) throw new Error("لم يتم العثور على أعمدة درجات في هذه الورقة.");

            // 3. Map headers to columnsConfig
            const newConfig = [...columnsConfig];
            let headerIdx = 0;

            for (let i = 0; i < newConfig.length; i++) {
                if (headerIdx >= gradeHeaders.length) break; // No more headers to map

                const header = gradeHeaders[headerIdx];
                const { label, maxScore } = extractHeaderMetadata(header);

                // Update column config
                newConfig[i] = {
                    ...newConfig[i],
                    label: label,
                    maxScore: maxScore,
                    isVisible: true,
                    url: source.url, // Display link
                    dataSource: {
                        sourceId: autoGenSourceId,
                        sheet: autoGenSheet,
                        sourceHeader: header
                    }
                };
                
                headerIdx++;
            }

            // --- STEP 4: SAVE CONFIGURATION IMMEDIATELY ---
            setColumnsConfig(newConfig);
            saveWorksConfig(activeTab, newConfig);

            // --- STEP 5: IMPORT & SAVE DATA IMMEDIATELY ---
            const newDataMap = { ...gridData };
            const recordsToSave: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];
            let updatedCount = 0;

            // Identify columns that were just auto-generated/linked to this sheet
            const activeCols = newConfig.filter(c => c.isVisible && c.dataSource?.sheet === autoGenSheet && c.dataSource?.sourceId === autoGenSourceId);

            data.forEach(row => {
                // Match Student
                const nid = row['nationalId'] || row['رقم الهوية'] || row['السجل المدني'] || Object.values(row).find((v: any) => String(v).length === 10 && !isNaN(Number(v)));
                const name = row['name'] || row['studentName'] || row['اسم الطالب'] || row['الاسم'];

                let student: Student | undefined;
                if (nid) student = students.find(s => s.nationalId === String(nid).trim());
                if (!student && name) student = students.find(s => s.name.includes(String(name).trim()));

                if (student) {
                    if (!newDataMap[student.id]) newDataMap[student.id] = {};

                    activeCols.forEach(col => {
                        const headerKey = col.dataSource!.sourceHeader;
                        const rawVal = row[headerKey];
                        const linkVal = row[`${headerKey}_HYPERLINK`]; 

                        const val = parseFloat(rawVal);
                        if (!isNaN(val)) {
                            // 1. Update Local Grid State
                            newDataMap[student.id][col.key] = {
                                score: val.toString(),
                                url: linkVal 
                            };

                            // 2. Prepare Record for Database
                            const existingRecord = performance.find(p => 
                                p.studentId === student!.id && 
                                p.category === activeTab && 
                                p.subject === selectedSubject && 
                                p.notes === col.key 
                            );

                            recordsToSave.push({
                                id: existingRecord ? existingRecord.id : Date.now().toString() + Math.random().toString(36).substr(2, 5) + updatedCount,
                                studentId: student!.id,
                                subject: selectedSubject,
                                title: col.label,
                                category: activeTab,
                                score: val,
                                maxScore: col.maxScore,
                                date: existingRecord ? existingRecord.date : today,
                                notes: col.key,
                                url: linkVal
                            });
                            
                            updatedCount++;
                        }
                    });
                }
            });

            // Update UI & DB
            setGridData(newDataMap);
            
            if (recordsToSave.length > 0) {
                onAddPerformance(recordsToSave); // Saves to DB immediately
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            }

            alert(`تم تهيئة الجدول واستيراد ${updatedCount} درجة وحفظ التغييرات بنجاح!`);
            setIsConfigModalOpen(false);

        } catch (error: any) {
            alert(`فشل التوليد التلقائي: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in relative">
             <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Table className="text-primary" />
                        متابعة الأعمال
                    </h2>
                    <p className="text-gray-500 mt-2">رصد الدرجات التفصيلية (واجبات، أنشطة، اختبارات قصيرة).</p>
                </div>
                <div className="flex items-center gap-2">
                     <select 
                        value={selectedSubject} 
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700"
                    >
                        <option value="رياضيات">رياضيات</option>
                        <option value="علوم">علوم</option>
                        <option value="لغة عربية">لغة عربية</option>
                        <option value="لغة إنجليزية">لغة إنجليزية</option>
                    </select>
                    <button 
                        onClick={() => setIsConfigModalOpen(true)}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold text-sm hover:bg-black"
                    >
                        <Settings size={18} />
                        إعداد الأعمدة
                    </button>
                    <button 
                        onClick={handleSaveGrid}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold text-sm hover:bg-green-700"
                    >
                         {savedSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
                        {savedSuccess ? 'تم الحفظ' : 'حفظ الدرجات'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b">
                 {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => (
                     <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === cat ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                     >
                         {cat === 'ACTIVITY' && 'الأنشطة'}
                         {cat === 'HOMEWORK' && 'الواجبات'}
                         {cat === 'PLATFORM_EXAM' && 'اختبارات المنصة'}
                         {cat === 'YEAR_WORK' && 'أعمال السنة'}
                     </button>
                 ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto bg-white rounded-xl shadow border border-gray-200">
                <table className="w-full text-right text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 border-b border-l w-12 text-center">#</th>
                            <th className="p-3 border-b border-l min-w-[200px]">اسم الطالب</th>
                            {columnsConfig.filter(c => c.isVisible).map(col => (
                                <th key={col.key} className="p-2 border-b border-l min-w-[100px] text-center relative group">
                                    <div className="text-xs text-gray-500 mb-1">{col.label}</div>
                                    <div className="text-[10px] text-gray-400">({col.maxScore})</div>
                                    {col.url && (
                                        <a href={col.url} target="_blank" rel="noreferrer" className="absolute top-1 left-1 text-blue-400 hover:text-blue-600">
                                            <ExternalLink size={10}/>
                                        </a>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, i) => (
                            <tr key={student.id} className="hover:bg-gray-50">
                                <td className="p-3 border-b border-l text-center bg-gray-50 text-gray-500">{i + 1}</td>
                                <td className="p-3 border-b border-l font-bold text-gray-700">{student.name}</td>
                                {columnsConfig.filter(c => c.isVisible).map(col => {
                                    const cellData = gridData[student.id]?.[col.key];
                                    return (
                                        <td key={col.key} className="p-1 border-b border-l text-center relative">
                                            <input 
                                                type="number" 
                                                className="w-full h-full text-center p-2 outline-none focus:bg-blue-50 transition-colors bg-transparent"
                                                value={cellData?.score || ''}
                                                onChange={(e) => handleScoreChange(student.id, col.key, e.target.value)}
                                                placeholder="-"
                                            />
                                            {cellData?.url && (
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" title="يوجد رابط إثبات"></div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Config Modal */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">إعدادات الأعمدة ({activeTab})</h3>
                            <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <AlertCircle size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Auto Gen Section */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                    <RefreshCw size={16}/> التوليد التلقائي من ملف Excel
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="رابط ملف Excel (SharePoint / OneDrive / Google)" 
                                            className="flex-1 p-2 border rounded text-sm dir-ltr"
                                            value={manualUrl}
                                            onChange={e => setManualUrl(e.target.value)}
                                        />
                                        <button onClick={handleConnectSource} disabled={isGenerating} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm">
                                            {isGenerating ? <Loader2 className="animate-spin"/> : 'جلب الملف'}
                                        </button>
                                    </div>

                                    {sheetNames.length > 0 && (
                                        <div className="flex gap-2 items-center animate-fade-in">
                                            <span className="text-sm font-bold text-gray-600">اختر الورقة:</span>
                                            <select 
                                                className="p-2 border rounded text-sm flex-1"
                                                value={autoGenSheet}
                                                onChange={e => setAutoGenSheet(e.target.value)}
                                            >
                                                {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <button 
                                                onClick={handleAutoGenColumns}
                                                disabled={isGenerating}
                                                className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm"
                                            >
                                                توليد الأعمدة واستيراد الدرجات
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Manual Config */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-700">تخصيص الأعمدة يدوياً</h4>
                                {columnsConfig.map((col, idx) => (
                                    <div key={col.key} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                                        <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                                        <input 
                                            type="checkbox" 
                                            checked={col.isVisible} 
                                            onChange={(e) => {
                                                const newConf = [...columnsConfig];
                                                newConf[idx].isVisible = e.target.checked;
                                                setColumnsConfig(newConf);
                                            }}
                                        />
                                        <input 
                                            className="flex-1 p-1 border rounded text-sm"
                                            value={col.label}
                                            onChange={(e) => {
                                                const newConf = [...columnsConfig];
                                                newConf[idx].label = e.target.value;
                                                setColumnsConfig(newConf);
                                            }}
                                        />
                                        <span className="text-xs text-gray-500">Max:</span>
                                        <input 
                                            type="number"
                                            className="w-16 p-1 border rounded text-sm"
                                            value={col.maxScore}
                                            onChange={(e) => {
                                                const newConf = [...columnsConfig];
                                                newConf[idx].maxScore = Number(e.target.value);
                                                setColumnsConfig(newConf);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold">إلغاء</button>
                            <button 
                                onClick={() => {
                                    saveWorksConfig(activeTab, columnsConfig);
                                    setIsConfigModalOpen(false);
                                }} 
                                className="px-4 py-2 bg-primary text-white rounded font-bold"
                            >
                                حفظ الإعدادات
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;