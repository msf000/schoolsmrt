import React, { useState, useEffect } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, WorksColumnConfig } from '../types';
import { getWorksConfig, saveWorksConfig, getWorksMasterUrl, saveWorksMasterUrl, getSchools } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Settings, RefreshCw, CheckCircle, ExternalLink, Loader2, Table, AlertCircle, PlusCircle, Link as LinkIcon, Edit2, Cloud } from 'lucide-react';

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
    
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Persistent Master URL
    const [masterUrl, setMasterUrl] = useState('');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isCloudLink, setIsCloudLink] = useState(false);

    useEffect(() => {
        // 1. Try to get from Cloud (School Record) first
        const schools = getSchools();
        if (schools.length > 0 && schools[0].worksMasterUrl) {
            setMasterUrl(schools[0].worksMasterUrl);
            setIsCloudLink(true);
        } else {
            // 2. Fallback to Local Storage
            setMasterUrl(getWorksMasterUrl());
            setIsCloudLink(false);
        }
    }, []);

    useEffect(() => {
        // Load local config immediately
        const config = getWorksConfig(activeTab);
        setColumnsConfig(config);
        
        // Auto-Sync Logic if Master URL exists
        if (masterUrl && !isGenerating) {
            handleAutoSyncForTab(activeTab);
        }
    }, [activeTab, masterUrl]);

    // Re-build grid when performance records or tab changes
    useEffect(() => {
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

    // --- AUTO SYNC LOGIC ---

    const getKeywordsForCategory = (cat: PerformanceCategory): string[] => {
        switch(cat) {
            case 'ACTIVITY': return ['نشاط', 'activity', 'أنشطة', 'activities'];
            case 'HOMEWORK': return ['واجب', 'homework', 'homeworks'];
            case 'PLATFORM_EXAM': return ['منصة', 'platform', 'اختبار منصة'];
            case 'YEAR_WORK': return ['أعمال سنة', 'year work', 'year'];
            default: return [];
        }
    };

    const handleAutoSyncForTab = async (category: PerformanceCategory) => {
        setIsGenerating(true);
        setStatusMsg('جاري مزامنة البيانات من الملف...');
        try {
            // 1. Fetch Workbook
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            
            // 2. Find Matching Sheet
            const keywords = getKeywordsForCategory(category);
            const matchingSheet = sheetNames.find(name => 
                keywords.some(kw => name.toLowerCase().includes(kw))
            );

            if (!matchingSheet) {
                setStatusMsg(`⚠️ لم يتم العثور على ورقة عمل باسم "${keywords[0]}"`);
                setIsGenerating(false);
                return;
            }

            // 3. Process Data from that Sheet
            await syncDataFromSheet(workbook, matchingSheet, category);
            setStatusMsg(`✅ تم تحديث بيانات ${matchingSheet} بنجاح`);

        } catch (error: any) {
            console.error("Auto Sync Error:", error);
            setStatusMsg(`❌ فشل المزامنة: ${error.message}`);
        } finally {
            setTimeout(() => setStatusMsg(''), 5000);
            setIsGenerating(false);
        }
    };

    const syncDataFromSheet = async (workbook: any, sheetName: string, category: PerformanceCategory) => {
         const { headers, data } = getSheetHeadersAndData(workbook, sheetName);
            
        // Filter out non-grade headers
        const excludeKeywords = ['name', 'id', 'student', 'phone', 'email', 'mobile', 'اسم', 'هوية', 'سجل', 'جوال', 'صف', 'فصل'];
        const gradeHeaders = headers.filter(h => 
            !excludeKeywords.some(kw => h.toLowerCase().includes(kw))
        );

        if (gradeHeaders.length === 0) return; // No columns to map

        // Generate New Config
        const newConfig: WorksColumnConfig[] = [];
        gradeHeaders.forEach((header, index) => {
            const { label, maxScore } = extractHeaderMetadata(header);
            newConfig.push({
                key: `excel_${category}_${index}`, // Deterministic key based on index to reuse cols if possible? Or unique. Unique is safer for now.
                label: label,
                maxScore: maxScore,
                isVisible: true,
                url: masterUrl,
                dataSource: {
                    sourceId: 'master',
                    sheet: sheetName,
                    sourceHeader: header
                }
            });
        });

        setColumnsConfig(newConfig);
        saveWorksConfig(category, newConfig);

        // Map Data
        const newDataMap: any = {}; // Temporary local map to update state
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        // Clone existing grid to not lose other subjects if needed, though here we might overwrite
        // For simplicity in this auto-sync, we rebuild records for THIS category/subject
        
        data.forEach(row => {
            const nid = row['nationalId'] || row['رقم الهوية'] || row['السجل المدني'] || Object.values(row).find((v: any) => String(v).length === 10 && !isNaN(Number(v)));
            const name = row['name'] || row['studentName'] || row['اسم الطالب'] || row['الاسم'];

            let student: Student | undefined;
            if (nid) student = students.find(s => s.nationalId === String(nid).trim());
            if (!student && name) student = students.find(s => s.name.includes(String(name).trim()));

            if (student) {
                if (!newDataMap[student.id]) newDataMap[student.id] = {};

                newConfig.forEach(col => {
                    const headerKey = col.dataSource!.sourceHeader;
                    const rawVal = row[headerKey];
                    const linkVal = row[`${headerKey}_HYPERLINK`]; 

                    const val = parseFloat(rawVal);
                    if (!isNaN(val)) {
                        newDataMap[student.id][col.key] = { score: val.toString(), url: linkVal };

                        recordsToSave.push({
                            id: `${student!.id}-${category}-${col.key}`, // Deterministic ID for upsert
                            studentId: student!.id,
                            subject: selectedSubject,
                            title: col.label,
                            category: category,
                            score: val,
                            maxScore: col.maxScore,
                            date: today,
                            notes: col.key,
                            url: linkVal
                        });
                    }
                });
            }
        });
        
        // Update DB
        if (recordsToSave.length > 0) {
            onAddPerformance(recordsToSave);
        }
    };


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
        // ... (Manual save logic, kept for manual edits)
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        students.forEach(student => {
            columnsConfig.forEach(col => {
                if (col.isVisible) {
                    const cellData = gridData[student.id]?.[col.key];
                    if (cellData && cellData.score !== '' && cellData.score !== undefined) {
                         const val = parseFloat(cellData.score);
                         if (!isNaN(val)) {
                            recordsToSave.push({
                                id: `${student.id}-${activeTab}-${col.key}`,
                                studentId: student.id,
                                subject: selectedSubject,
                                title: col.label,
                                category: activeTab,
                                score: val,
                                maxScore: col.maxScore,
                                date: today,
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

    const handleSaveMasterUrl = () => {
        saveWorksMasterUrl(masterUrl);
        setIsEditingUrl(false);
        if (masterUrl) handleAutoSyncForTab(activeTab); // Trigger sync immediately
    };

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in relative">
             <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Table className="text-primary" />
                            متابعة الأعمال
                        </h2>
                        <p className="text-gray-500 mt-2">رصد الدرجات (يتم التحديث تلقائياً عند تغيير التبويب).</p>
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
                            onClick={handleSaveGrid}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold text-sm hover:bg-green-700"
                        >
                             {savedSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
                            {savedSuccess ? 'تم الحفظ' : 'حفظ يدوي'}
                        </button>
                    </div>
                </div>

                {/* Master Link Input */}
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm"><LinkIcon size={16}/></div>
                    <div className="flex-1">
                        {isEditingUrl || !masterUrl ? (
                            <div className="flex gap-2">
                                <input 
                                    className="w-full p-1 bg-white border rounded text-sm dir-ltr" 
                                    placeholder="أدخل رابط ملف Google Drive / Excel الرئيسي هنا..."
                                    value={masterUrl}
                                    onChange={e => setMasterUrl(e.target.value)}
                                />
                                <button onClick={handleSaveMasterUrl} className="px-3 bg-blue-600 text-white rounded text-xs font-bold whitespace-nowrap">حفظ محلياً</button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-sm text-blue-800 font-bold truncate dir-ltr">{masterUrl}</span>
                                    {isCloudLink && <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold"><Cloud size={10}/> رابط موحد (سحابي)</span>}
                                </div>
                                <button onClick={() => setIsEditingUrl(true)} className="text-gray-500 hover:text-blue-600 p-1"><Edit2 size={14}/></button>
                            </div>
                        )}
                    </div>
                </div>
                {statusMsg && <div className="text-xs mt-2 font-bold animate-pulse text-gray-600">{statusMsg}</div>}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b">
                 {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => (
                     <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors relative ${activeTab === cat ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                     >
                         <div className="flex items-center gap-2">
                             {cat === 'ACTIVITY' && 'الأنشطة'}
                             {cat === 'HOMEWORK' && 'الواجبات'}
                             {cat === 'PLATFORM_EXAM' && 'اختبارات المنصة'}
                             {cat === 'YEAR_WORK' && 'أعمال السنة'}
                             {activeTab === cat && isGenerating && <Loader2 size={12} className="animate-spin"/>}
                         </div>
                     </button>
                 ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto bg-white rounded-xl shadow border border-gray-200">
                {!masterUrl ? (
                     <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <LinkIcon size={48} className="mb-4 opacity-20"/>
                        <p className="text-lg font-bold">لم يتم ربط ملف الدرجات</p>
                        <p className="text-sm mt-2">يرجى إضافة رابط ملف Google Drive في الأعلى (أو في إعدادات المدرسة) لتفعيل المزامنة التلقائية.</p>
                        <button onClick={() => setIsEditingUrl(true)} className="mt-4 text-primary font-bold hover:underline">إضافة الرابط يدوياً</button>
                    </div>
                ) : columnsConfig.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        {isGenerating ? <Loader2 size={48} className="animate-spin mb-4 opacity-20"/> : <Table size={48} className="mb-4 opacity-20"/>}
                        <p className="text-lg font-bold">{isGenerating ? 'جاري جلب البيانات...' : 'لا توجد بيانات'}</p>
                        <p className="text-sm mt-2">{isGenerating ? 'يرجى الانتظار بينما نقوم بمزامنة الملف.' : 'تأكد من وجود ورقة عمل في الملف تطابق اسم التبويب الحالي.'}</p>
                        {!isGenerating && <button onClick={() => handleAutoSyncForTab(activeTab)} className="mt-4 bg-gray-100 px-4 py-2 rounded text-gray-600 text-sm font-bold hover:bg-gray-200">محاولة المزامنة يدوياً</button>}
                    </div>
                ) : (
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
                                                    <a href={cellData.url} target="_blank" className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full cursor-pointer hover:scale-150 transition-transform" title="رابط المصدر"></a>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
             <div className="mt-2 text-[10px] text-gray-400 text-center">
                يتم حفظ الرابط محلياً. تأكد من أن ملف Google Drive متاح للمشاركة (Anyone with link) أو لديك صلاحية الوصول إليه.
            </div>
        </div>
    );
};

export default WorksTracking;