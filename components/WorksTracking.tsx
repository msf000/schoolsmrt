
import React, { useState, useEffect } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, WorksColumnConfig, Subject, AttendanceRecord, AttendanceStatus } from '../types';
import { getWorksConfig, saveWorksConfig, getWorksMasterUrl, saveWorksMasterUrl, getSchools, getSubjects, bulkAddPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, CheckCircle, ExternalLink, Loader2, Table, AlertCircle, Link as LinkIcon, Edit2, Cloud, PieChart, Calculator, TrendingUp, Sigma, Activity, Target, Settings, Plus, Trash2, Eye, EyeOff, Globe, List, Layout, PenTool } from 'lucide-react';

interface WorksTrackingProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
}

// Helper to extract label and max score from header
const extractHeaderMetadata = (header: string): { label: string, maxScore: number } => {
    let maxScore = 10;
    let label = header;
    const match = header.match(/\((\d+)\)/);
    if (match) {
        maxScore = parseInt(match[1]);
        label = header.replace(/\(\d+\)/, '').trim();
    }
    return { label, maxScore };
};

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance }) => {
    // Main View State: GRADING vs MANAGEMENT
    const [activeMode, setActiveMode] = useState<'GRADING' | 'MANAGEMENT'>('GRADING');

    // Shared State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [activeTab, setActiveTab] = useState<PerformanceCategory>('ACTIVITY'); // Sub-tab for category
    
    const [columnsConfig, setColumnsConfig] = useState<WorksColumnConfig[]>([]);
    const [gridData, setGridData] = useState<Record<string, Record<string, { score: string, url?: string }>>>({});
    const [activityTarget, setActivityTarget] = useState<number>(13); 
    
    // Status States
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isCloudLink, setIsCloudLink] = useState(false);

    useEffect(() => {
        const loadedSubjects = getSubjects();
        setSubjects(loadedSubjects);
        if (loadedSubjects.length > 0) setSelectedSubject(loadedSubjects[0].name);
        else setSelectedSubject('عام');

        const schools = getSchools();
        if (schools.length > 0 && schools[0].worksMasterUrl) {
            setMasterUrl(schools[0].worksMasterUrl);
            setIsCloudLink(true);
        } else {
            setMasterUrl(getWorksMasterUrl());
            setIsCloudLink(false);
        }
        
        const savedTarget = localStorage.getItem('works_activity_target');
        if (savedTarget) setActivityTarget(parseInt(savedTarget));
    }, []);

    useEffect(() => {
        const config = getWorksConfig(activeTab);
        setColumnsConfig(config);
        
        // Auto-sync logic (only in grading mode and if empty)
        if (activeMode === 'GRADING' && masterUrl && config.length === 0 && !isGenerating && activeTab !== 'YEAR_WORK') {
            handleAutoSyncForTab(activeTab);
        }
    }, [activeTab, masterUrl, activeMode]);

    useEffect(() => {
        if (activeTab === 'YEAR_WORK') return;
        const newGrid: Record<string, Record<string, { score: string, url?: string }>> = {};
        performance.forEach(p => {
            if (p.category === activeTab && p.subject === selectedSubject && p.notes) {
                if (!newGrid[p.studentId]) newGrid[p.studentId] = {};
                newGrid[p.studentId][p.notes] = { score: p.score.toString(), url: p.url };
            }
        });
        setGridData(newGrid);
    }, [performance, activeTab, selectedSubject]);

    const handleActivityTargetChange = (val: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            setActivityTarget(num);
            localStorage.setItem('works_activity_target', num.toString());
        }
    };

    // --- Sync Logic ---
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
        if (category === 'YEAR_WORK') return;
        setIsGenerating(true);
        setStatusMsg('جاري مزامنة البيانات من الملف...');
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            const keywords = getKeywordsForCategory(category);
            const matchingSheet = sheetNames.find(name => keywords.some(kw => name.toLowerCase().includes(kw)));
            if (!matchingSheet) {
                setStatusMsg(`⚠️ لم يتم العثور على ورقة عمل باسم "${keywords[0]}"`);
                setIsGenerating(false);
                return;
            }
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
        const excludeKeywords = ['name', 'id', 'student', 'phone', 'email', 'mobile', 'اسم', 'هوية', 'سجل', 'جوال', 'صف', 'فصل'];
        const gradeHeaders = headers.filter(h => !excludeKeywords.some(kw => h.toLowerCase().includes(kw)));
        if (gradeHeaders.length === 0) return;

        // 1. Load EXISTING Config to preserve URLs created manually
        const currentConfig = getWorksConfig(category);

        const newConfig: WorksColumnConfig[] = [];
        gradeHeaders.forEach((header, index) => {
            const { label, maxScore } = extractHeaderMetadata(header);
            const key = `excel_${category}_${index}`;
            
            // Check if we have an existing manual configuration for this column
            const existingCol = currentConfig.find(c => c.key === key);
            // PRESERVE MANUAL URL: If exists, use it. Otherwise empty.
            // Strict: Do not ever pull URL from excel.
            const preservedUrl = existingCol ? existingCol.url : ''; 

            newConfig.push({
                key: key,
                label: label,
                maxScore: maxScore,
                isVisible: true,
                url: preservedUrl, 
                dataSource: { sourceId: 'master', sheet: sheetName, sourceHeader: header }
            });
        });
        
        setColumnsConfig(newConfig);
        saveWorksConfig(category, newConfig);

        const newDataMap: any = {};
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        data.forEach(row => {
            const nid = row['nationalId'] || row['رقم الهوية'] || row['السجل المدني'] || Object.values(row).find((v: any) => String(v).length === 10 && !isNaN(Number(v)));
            const name = row['name'] || row['studentName'] || row['اسم الطالب'] || row['الاسم'];
            let student: Student | undefined;
            if (nid) student = students.find(s => s.nationalId === String(nid).trim());
            if (!student && name) {
                 const cleanName = String(name).trim();
                 student = students.find(s => s.name.trim() === cleanName);
                 if (!student && cleanName.length > 4) student = students.find(s => s.name.trim().includes(cleanName));
            }
            if (student) {
                if (!newDataMap[student.id]) newDataMap[student.id] = {};
                newConfig.forEach(col => {
                    const headerKey = col.dataSource!.sourceHeader;
                    const rawVal = row[headerKey];
                    // STRICTLY IGNORE HYPERLINKS
                    
                    const val = parseFloat(rawVal);
                    if (!isNaN(val)) {
                        // Apply the column's manual URL to the record. 
                        // If no manual URL is set, the record gets an empty URL.
                        newDataMap[student.id][col.key] = { score: val.toString(), url: col.url }; 
                        recordsToSave.push({
                            id: `${student!.id}-${category}-${col.key}`,
                            studentId: student!.id,
                            subject: selectedSubject,
                            title: col.label,
                            category: category,
                            score: val,
                            maxScore: col.maxScore,
                            date: today,
                            notes: col.key,
                            url: col.url // Strict: Use the Manual URL from config only
                        });
                    }
                });
            }
        });
        if (recordsToSave.length > 0) onAddPerformance(recordsToSave);
    };

    // --- Entry Logic ---
    const handleScoreChange = (studentId: string, colKey: string, val: string) => {
        setGridData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [colKey]: { ...prev[studentId]?.[colKey], score: val } }
        }));
    };

    const handleSaveGrid = () => {
        if (activeTab === 'YEAR_WORK') return;
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
                                url: col.url // Enforce column manual URL
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
        if (masterUrl) handleAutoSyncForTab(activeTab);
    };

    // --- Management Logic ---
    const handleAddColumn = () => {
        const newCol: WorksColumnConfig = {
            key: `manual_${Date.now()}`,
            label: 'عنوان جديد',
            maxScore: 10,
            isVisible: true,
            url: ''
        };
        setColumnsConfig([...columnsConfig, newCol]);
    };

    const handleUpdateColumn = (index: number, field: keyof WorksColumnConfig, value: any) => {
        const updated = [...columnsConfig];
        updated[index] = { ...updated[index], [field]: value };
        setColumnsConfig(updated);
    };

    const handleDeleteColumn = (index: number) => {
        if (confirm('هل أنت متأكد من حذف هذا النشاط؟ ستفقد الدرجات المرتبطة به إذا لم يتم حفظها مسبقاً.')) {
            const updated = columnsConfig.filter((_, i) => i !== index);
            setColumnsConfig(updated);
        }
    };

    const handleSaveConfig = () => {
        // 1. Save Config Locally
        saveWorksConfig(activeTab, columnsConfig);
        
        // 2. Propagate Links to Database Records (So students can see them)
        const recordsToUpdate: PerformanceRecord[] = [];
        
        columnsConfig.forEach(col => {
            // Find existing records for this column category/key
            const relevantRecords = performance.filter(p => p.category === activeTab && p.notes === col.key);
            
            relevantRecords.forEach(rec => {
                // Force update URL to match the Config URL (Manual), ignoring whatever was there before
                if (rec.url !== col.url) {
                    recordsToUpdate.push({ ...rec, url: col.url });
                }
            });
        });

        if (recordsToUpdate.length > 0) {
            onAddPerformance(recordsToUpdate);
        }

        setStatusMsg('✅ تم حفظ الإعدادات وتحديث الروابط في سجلات الطلاب.');
        setTimeout(() => setStatusMsg(''), 3000);
    };

    // --- RENDERERS ---
    const renderYearWorkTable = () => {
        const hwConfig = getWorksConfig('HOMEWORK').filter(c => c.isVisible);
        const totalHWCount = hwConfig.length;
        
        return (
            <table className="w-full text-right text-sm border-collapse whitespace-nowrap">
                <thead className="bg-gray-100 text-gray-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-3 border-b border-l w-12 text-center bg-gray-200">#</th>
                        <th className="p-3 border-b border-l min-w-[150px] bg-gray-200">الفصل</th>
                        <th className="p-3 border-b border-l min-w-[200px] bg-gray-200">اسم الطالب</th>
                        
                        <th className="p-2 border-b border-l text-center bg-blue-50 text-blue-900">الواجبات (10)</th>
                        <th className="p-2 border-b border-l text-center bg-amber-50 text-amber-900">الأنشطة (15)</th>
                        <th className="p-2 border-b border-l text-center bg-green-50 text-green-900">المشاركة (15)</th>
                        <th className="p-2 border-b border-l text-center bg-purple-50 text-purple-900">المنصة (20)</th>
                        <th className="p-2 border-b border-l text-center bg-gray-800 text-white font-black">المجموع (60)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {students.map((student, i) => {
                        // Homework
                        const studentHWs = performance.filter(p => p.studentId === student.id && p.category === 'HOMEWORK' && p.subject === selectedSubject);
                        const distinctHWs = new Set(studentHWs.map(p => p.notes)).size;
                        const hwPercent = totalHWCount > 0 ? (distinctHWs / totalHWCount) * 100 : 0;
                        const gradeHW = (hwPercent / 100) * 10;

                        // Activity
                        const studentActs = performance.filter(p => p.studentId === student.id && p.category === 'ACTIVITY' && p.subject === selectedSubject);
                        let actSum = 0;
                        studentActs.forEach(p => {
                            if (!p.title.includes('حضور') && !p.title.toLowerCase().includes('attendance')) actSum += p.score;
                        });
                        const actPercent = activityTarget > 0 ? (actSum / activityTarget) : 0;
                        const gradeAct = Math.min(actPercent * 15, 15);

                        // Platform Exams (Weighted 20)
                        const studentExams = performance.filter(p => p.studentId === student.id && p.category === 'PLATFORM_EXAM' && p.subject === selectedSubject);
                        let examScoreSum = 0;
                        let examMaxSum = 0;
                        studentExams.forEach(p => {
                            examScoreSum += p.score;
                            examMaxSum += p.maxScore > 0 ? p.maxScore : 20;
                        });
                        const examWeightedRaw = examMaxSum > 0 ? (examScoreSum / examMaxSum) * 20 : 0;
                        const examWeighted = Math.min(examWeightedRaw, 20);

                        // Attendance/Participation
                        const studentAtt = attendance.filter(a => a.studentId === student.id);
                        const presentCount = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
                        const totalDays = studentAtt.length;
                        const attPercent = totalDays > 0 ? (presentCount / totalDays) * 100 : 100;
                        const gradePart = (attPercent / 100) * 15;

                        const totalPeriod = gradeHW + gradeAct + gradePart + examWeighted;

                        return (
                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 border-l text-center bg-gray-50 text-gray-500">{i + 1}</td>
                                <td className="p-3 border-l text-gray-600 text-xs">{student.className}</td>
                                <td className="p-3 border-l font-bold text-gray-800">{student.name}</td>

                                <td className="p-3 border-l text-center font-bold bg-blue-50/50">{gradeHW.toFixed(1)}</td>
                                <td className="p-3 border-l text-center font-bold bg-amber-50/50">{gradeAct.toFixed(1)}</td>
                                <td className="p-3 border-l text-center font-bold bg-green-50/50">{gradePart.toFixed(1)}</td>
                                <td className="p-3 border-l text-center font-bold bg-purple-50/50">{examWeighted.toFixed(1)}</td>
                                <td className="p-3 border-l text-center font-black text-white bg-gray-700">{totalPeriod.toFixed(1)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col animate-fade-in relative bg-gray-50">
             
             {/* MAIN TOP TABS */}
             <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-2">
                 <button 
                    onClick={() => setActiveMode('GRADING')}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeMode === 'GRADING' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                     <Table size={18}/> <span className="hidden md:inline">رصد الدرجات</span><span className="md:hidden">الرصد</span>
                 </button>
                 <button 
                    onClick={() => setActiveMode('MANAGEMENT')}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeMode === 'MANAGEMENT' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                     <Settings size={18}/> <span className="hidden md:inline">إدارة الأنشطة والروابط</span><span className="md:hidden">الإعدادات</span>
                 </button>
             </div>

             {/* Header Section (Common) */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {activeMode === 'GRADING' ? <List className="text-primary"/> : <PenTool className="text-purple-600"/>}
                        {activeMode === 'GRADING' ? 'رصد الدرجات' : 'إدارة أسماء الأنشطة والروابط'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {activeMode === 'GRADING' 
                            ? 'أدخل الدرجات في الخلايا أدناه.' 
                            : 'تعديل أسماء الأنشطة والروابط.'}
                    </p>
                </div>
                
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
                    {/* Subject Selector (Only relevant in grading usually, but maybe management too if we split config per subject later) */}
                    <select 
                        value={selectedSubject} 
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    >
                        {subjects.length > 0 ? subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>) : <option value="عام">عام</option>}
                    </select>

                    {activeMode === 'GRADING' && activeTab !== 'YEAR_WORK' && (
                        <button onClick={handleSaveGrid} className="bg-green-600 text-white px-6 py-2 rounded-lg flex justify-center items-center gap-2 shadow-md transition-colors font-bold text-sm hover:bg-green-700">
                            {savedSuccess ? <CheckCircle size={18} /> : <Save size={18} />} {savedSuccess ? 'تم الحفظ' : 'حفظ الدرجات'}
                        </button>
                    )}
                </div>
            </div>

            {/* Cloud Link Box (Only in Grading Mode) */}
            {activeMode === 'GRADING' && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
                    <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm hidden md:block"><LinkIcon size={16}/></div>
                    <div className="flex-1 w-full">
                        {isEditingUrl || !masterUrl ? (
                            <div className="flex gap-2 w-full">
                                <input className="w-full p-1 bg-white border rounded text-sm dir-ltr" placeholder="رابط ملف Excel (للمزامنة)..." value={masterUrl} onChange={e => setMasterUrl(e.target.value)} />
                                <button onClick={handleSaveMasterUrl} className="px-3 bg-blue-600 text-white rounded text-xs font-bold whitespace-nowrap">حفظ</button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm text-blue-800 font-bold truncate dir-ltr max-w-[200px] md:max-w-md">{masterUrl}</span>
                                    {isCloudLink && <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold"><Cloud size={10}/> رابط موحد (سحابي)</span>}
                                </div>
                                <button onClick={() => setIsEditingUrl(true)} className="text-gray-500 hover:text-blue-600 p-1"><Edit2 size={14}/></button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {statusMsg && <div className="mb-4 text-sm font-bold text-center bg-green-100 text-green-800 p-2 rounded-lg animate-pulse">{statusMsg}</div>}

            {/* SUB TABS */}
            <div className="flex overflow-x-auto gap-2 border-b border-gray-200 mb-4 pb-1 custom-scrollbar">
                {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => {
                    if (activeMode === 'MANAGEMENT' && cat === 'YEAR_WORK') return null; // No config for Year Work
                    return (
                        <button 
                            key={cat} 
                            onClick={() => setActiveTab(cat)} 
                            className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors relative whitespace-nowrap flex-shrink-0 ${activeTab === cat ? 'bg-white text-gray-800 border border-b-0 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <div className="flex items-center gap-2">
                                {cat === 'ACTIVITY' && <Activity size={16}/>}
                                {cat === 'HOMEWORK' && <List size={16}/>}
                                {cat === 'PLATFORM_EXAM' && <TrendingUp size={16}/>}
                                {cat === 'YEAR_WORK' && <Layout size={16}/>}
                                
                                {cat === 'ACTIVITY' && 'الأنشطة'}
                                {cat === 'HOMEWORK' && 'الواجبات'}
                                {cat === 'PLATFORM_EXAM' && 'اختبارات المنصة'}
                                {cat === 'YEAR_WORK' && 'أعمال السنة (محسوبة)'}
                                {activeTab === cat && isGenerating && <Loader2 size={12} className="animate-spin"/>}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Activity Target Control (Visible in both modes for Activity tab) */}
            {activeTab === 'ACTIVITY' && (
                <div className="flex justify-end mb-2">
                    <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <Target size={16} className="text-amber-600"/>
                        <span className="text-xs font-bold text-amber-800">الهدف:</span>
                        <input type="number" min="1" value={activityTarget} onChange={(e) => handleActivityTargetChange(e.target.value)} className="w-16 p-1 text-center border rounded text-sm font-bold bg-white focus:ring-1 focus:ring-amber-500"/>
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white rounded-xl shadow border border-gray-200 relative min-h-[400px] flex flex-col">
                
                {/* --- CONFIGURATION MODE --- */}
                {activeMode === 'MANAGEMENT' && (
                    <div className="p-6 flex-1 overflow-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-700 text-sm md:text-base">إعداد أعمدة {activeTab === 'ACTIVITY' ? 'الأنشطة' : activeTab === 'HOMEWORK' ? 'الواجبات' : 'الاختبارات'}</h3>
                            <button onClick={handleAddColumn} className="flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-purple-100 shadow-sm whitespace-nowrap">
                                <Plus size={16}/> إضافة
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b text-sm">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4 w-1/4">اسم النشاط</th>
                                        <th className="p-4 w-24">العظمى</th>
                                        <th className="p-4">رابط النشاط (يظهر للطالب)</th>
                                        <th className="p-4 w-16 text-center">إظهار</th>
                                        <th className="p-4 w-16 text-center">حذف</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {columnsConfig.map((col, index) => (
                                        <tr key={col.key} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-center text-gray-400 font-bold">{index + 1}</td>
                                            <td className="p-4">
                                                <input 
                                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none font-bold text-gray-700"
                                                    value={col.label}
                                                    onChange={(e) => handleUpdateColumn(index, 'label', e.target.value)}
                                                    placeholder="مثال: واجب 1"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input 
                                                    type="number"
                                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none text-center font-bold"
                                                    value={col.maxScore}
                                                    onChange={(e) => handleUpdateColumn(index, 'maxScore', parseFloat(e.target.value))}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 border rounded p-1 bg-white focus-within:ring-2 focus-within:ring-purple-500">
                                                    <div className="bg-gray-100 p-1.5 rounded text-gray-500">
                                                        <LinkIcon size={16}/>
                                                    </div>
                                                    <input 
                                                        className="w-full outline-none text-sm dir-ltr text-left font-mono text-blue-600"
                                                        value={col.url || ''}
                                                        onChange={(e) => handleUpdateColumn(index, 'url', e.target.value)}
                                                        placeholder="https://..."
                                                    />
                                                    {col.url && (
                                                        <a href={col.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 rounded text-blue-500" title="تجربة الرابط">
                                                            <ExternalLink size={16}/>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => handleUpdateColumn(index, 'isVisible', !col.isVisible)}
                                                    className={`p-2 rounded-full transition-colors ${col.isVisible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                                                    title={col.isVisible ? 'إخفاء' : 'إظهار'}
                                                >
                                                    {col.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                                                </button>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => handleDeleteColumn(index)}
                                                    className="p-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {columnsConfig.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 m-4">
                                            <Settings size={32} className="mx-auto mb-2 opacity-50"/>
                                            لا توجد أنشطة مضافة. اضغط "إضافة" للبدء.
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <button 
                                onClick={handleSaveConfig} 
                                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-black shadow-lg flex items-center gap-2 transform transition-transform active:scale-95"
                            >
                                <Save size={18}/> حفظ وتحديث الروابط للجميع
                            </button>
                        </div>
                    </div>
                )}

                {/* --- GRADING MODE --- */}
                {activeMode === 'GRADING' && (
                    <div className="flex-1 overflow-auto relative">
                        {activeTab === 'YEAR_WORK' ? (
                            <div className="overflow-x-auto h-full">
                                {renderYearWorkTable()}
                            </div>
                        ) : !masterUrl && columnsConfig.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <LinkIcon size={48} className="mb-4 opacity-20"/>
                                <p className="text-lg font-bold">لم يتم إعداد الأنشطة</p>
                                <div className="flex gap-4 mt-4">
                                    <button onClick={() => setIsEditingUrl(true)} className="text-primary font-bold hover:underline">ربط ملف Excel</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={() => setActiveMode('MANAGEMENT')} className="text-purple-600 font-bold hover:underline">إعداد يدوي</button>
                                </div>
                            </div>
                        ) : columnsConfig.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                {isGenerating ? <Loader2 size={48} className="animate-spin mb-4 opacity-20"/> : <Table size={48} className="mb-4 opacity-20"/>}
                                <p className="text-lg font-bold">{isGenerating ? 'جاري جلب البيانات...' : 'لا توجد بيانات للعرض'}</p>
                                {!isGenerating && (
                                    <div className="flex gap-3 mt-4">
                                        <button onClick={() => handleAutoSyncForTab(activeTab)} className="bg-gray-100 px-4 py-2 rounded text-gray-600 text-sm font-bold hover:bg-gray-200">مزامنة من الملف</button>
                                        <button onClick={() => setActiveMode('MANAGEMENT')} className="bg-purple-50 px-4 py-2 rounded text-purple-700 text-sm font-bold hover:bg-purple-100">إضافة يدوية</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto h-full pb-2">
                                <table className="w-full text-right text-sm border-collapse whitespace-nowrap">
                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 border-b border-l w-12 text-center bg-gray-50">#</th>
                                        <th className="p-3 border-b border-l min-w-[180px] bg-gray-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                        {columnsConfig.filter(c => c.isVisible).map(col => (
                                            <th key={col.key} className="p-2 border-b border-l min-w-[100px] text-center relative group bg-gray-50">
                                                <div className="text-xs text-gray-500 mb-1">{col.label}</div>
                                                <div className="text-[10px] text-gray-400">({col.maxScore})</div>
                                                {col.url && <a href={col.url} target="_blank" className="absolute top-1 left-1 text-blue-400 hover:text-blue-600"><ExternalLink size={10}/></a>}
                                            </th>
                                        ))}
                                        {activeTab === 'ACTIVITY' && (
                                            <>
                                                <th className="p-3 border-b border-l min-w-[80px] text-center bg-amber-50 text-amber-800"><div className="flex items-center justify-center gap-1"><Sigma size={14}/> المجموع</div></th>
                                                <th className="p-3 border-b border-l min-w-[100px] text-center bg-orange-50 text-orange-800"><div className="flex items-center justify-center gap-1"><Activity size={14}/> إنجاز الأنشطة %</div></th>
                                            </>
                                        )}
                                        {activeTab === 'HOMEWORK' && (
                                            <>
                                                <th className="p-3 border-b border-l min-w-[80px] text-center bg-blue-50 text-blue-800">مكتمل</th>
                                                <th className="p-3 border-b border-l min-w-[100px] text-center bg-green-50 text-green-800">الإنجاز %</th>
                                            </>
                                        )}
                                        {activeTab === 'PLATFORM_EXAM' && (
                                            <>
                                                <th className="p-3 border-b border-l min-w-[100px] text-center bg-purple-50 text-purple-800"><div className="flex items-center justify-center gap-1"><Calculator size={14}/> المتوسط</div></th>
                                                <th className="p-3 border-b border-l min-w-[100px] text-center bg-indigo-50 text-indigo-800"><div className="flex items-center justify-center gap-1"><TrendingUp size={14}/> الموزونة (20)</div></th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, i) => {
                                        const renderedCells = columnsConfig.filter(c => c.isVisible).map(col => {
                                            const cellData = gridData[student.id]?.[col.key];
                                            return (
                                                <td key={col.key} className="p-1 border-b border-l text-center relative">
                                                    <input type="number" className="w-full h-full text-center p-2 outline-none focus:bg-blue-50 transition-colors bg-transparent min-w-[60px]" value={cellData?.score || ''} onChange={(e) => handleScoreChange(student.id, col.key, e.target.value)} placeholder="-"/>
                                                    {cellData?.url && <a href={cellData.url} target="_blank" className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></a>}
                                                </td>
                                            );
                                        });

                                        // Activity Stats
                                        let activityStats = null;
                                        if (activeTab === 'ACTIVITY') {
                                            let totalScore = 0;
                                            columnsConfig.filter(c => c.isVisible).forEach(col => {
                                                const val = parseFloat(gridData[student.id]?.[col.key]?.score || '0');
                                                if(!col.label.includes('حضور') && !isNaN(val)) totalScore += val;
                                            });
                                            const completionPct = activityTarget > 0 ? Math.round((totalScore / activityTarget) * 100) : 0;
                                            activityStats = (
                                                <>
                                                    <td className="p-3 border-b border-l text-center font-bold text-amber-700 bg-amber-50/30">{totalScore}</td>
                                                    <td className="p-3 border-b border-l text-center bg-orange-50/30"><span className="text-xs font-bold text-orange-800">{completionPct}%</span></td>
                                                </>
                                            );
                                        }
                                        // Homework Stats
                                        let homeworkStats = null;
                                        if (activeTab === 'HOMEWORK') {
                                            const totalItems = columnsConfig.filter(c => c.isVisible).length;
                                            const completedCount = columnsConfig.filter(c => c.isVisible && gridData[student.id]?.[c.key]?.score).length;
                                            const percentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
                                            homeworkStats = (
                                                <>
                                                    <td className="p-3 border-b border-l text-center font-bold text-blue-600 bg-blue-50/30">{completedCount}</td>
                                                    <td className="p-3 border-b border-l text-center bg-green-50/30"><span className="text-xs font-bold text-green-700">{percentage}%</span></td>
                                                </>
                                            );
                                        }
                                        // Platform Stats
                                        let platformStats = null;
                                        if (activeTab === 'PLATFORM_EXAM') {
                                            const validScores = columnsConfig.filter(c => c.isVisible).map(c => parseFloat(gridData[student.id]?.[c.key]?.score || 'NaN')).filter(v => !isNaN(v));
                                            const count = validScores.length;
                                            const average = count > 0 ? (validScores.reduce((a,b)=>a+b,0) / count) : 0;
                                            const weighted = count > 0 ? (average / 15) * 20 : 0;
                                            platformStats = (
                                                <>
                                                    <td className="p-3 border-b border-l text-center font-bold text-purple-700 bg-purple-50/30">{count > 0 ? average.toFixed(1) : '-'}</td>
                                                    <td className="p-3 border-b border-l text-center font-bold text-indigo-700 bg-indigo-50/30">{count > 0 ? weighted.toFixed(1) : '-'}</td>
                                                </>
                                            );
                                        }

                                        return (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="p-3 border-b border-l text-center bg-gray-50 text-gray-500">{i + 1}</td>
                                            <td className="p-3 border-b border-l font-bold text-gray-700 sticky right-0 bg-white z-10 shadow-sm border-r">{student.name}</td>
                                            {renderedCells}
                                            {activeTab === 'ACTIVITY' && activityStats}
                                            {activeTab === 'HOMEWORK' && homeworkStats}
                                            {activeTab === 'PLATFORM_EXAM' && platformStats}
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
             <div className="mt-2 text-[10px] text-gray-400 text-center">
                يتم حفظ الرابط محلياً. تأكد من أن ملف Google Drive متاح للمشاركة (Anyone with link) أو لديك صلاحية الوصول إليه.
            </div>
        </div>
    );
};

export default WorksTracking;
