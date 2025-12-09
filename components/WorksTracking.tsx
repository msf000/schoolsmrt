
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, Assignment, Subject, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, getSchools, getSubjects } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, CheckCircle, ExternalLink, Loader2, Table, Link as LinkIcon, Edit2, Cloud, Sigma, Activity, Target, Settings, Plus, Trash2, Eye, EyeOff, List, Layout, PenTool, RefreshCw, TrendingUp, AlertTriangle, Zap, Check } from 'lucide-react';

interface WorksTrackingProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

// Helper to extract label and max score from header ex: "Homework 1 (10)" -> maxScore: 10
const extractHeaderMetadata = (header: string): { label: string, maxScore: number } => {
    let maxScore = 10; // Default
    let label = header;
    
    // Look for patterns like (10) or [20] in the header
    const match = header.match(/[\(\[](\d+)[\)\]]/);
    if (match) {
        maxScore = parseInt(match[1]);
        label = header.replace(/[\(\[]\d+[\)\]]/, '').trim();
    }
    return { label, maxScore };
};

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    // Safety check
    if (!students || !performance || !attendance) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-gray-400" /></div>;
    }

    const [activeMode, setActiveMode] = useState<'GRADING' | 'MANAGEMENT'>(() => {
        return localStorage.getItem('works_tracking_mode') as any || 'GRADING';
    });
    const [activeTab, setActiveTab] = useState<PerformanceCategory>(() => {
        return localStorage.getItem('works_tracking_tab') as any || 'ACTIVITY';
    });

    useEffect(() => { localStorage.setItem('works_tracking_mode', activeMode); }, [activeMode]);
    useEffect(() => { localStorage.setItem('works_tracking_tab', activeTab); }, [activeTab]);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    
    // Data State
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({}); 
    const [activityTarget, setActivityTarget] = useState<number>(13); 
    
    // Status States
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isCloudLink, setIsCloudLink] = useState(false);

    // Quick Fill State
    const [quickFillValue, setQuickFillValue] = useState('');
    const [showQuickFill, setShowQuickFill] = useState<string | null>(null);

    // Debounce Ref
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const loadedSubjects = getSubjects(currentUser?.id);
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
    }, [currentUser]);

    const getKeywordsForCategory = (cat: PerformanceCategory): string[] => {
        switch (cat) {
            case 'ACTIVITY': 
                return ['نشاط', 'مشاركة', 'تفاعل', 'شفهي', 'عملي', 'activity', 'participation', 'classwork', 'act', 'part', 'شفوى', 'سلوك'];
            case 'HOMEWORK': 
                return ['واجب', 'منزلي', 'مهام', 'تطبيقات', 'homework', 'assignment', 'hw', 'home', 'tasks', 'sheet'];
            case 'PLATFORM_EXAM': 
                return ['اختبار', 'تقييم', 'منصة', 'تحريري', 'فترى', 'exam', 'quiz', 'test', 'midterm', 'final', 'platform', 'period', 'فترة'];
            default: return [];
        }
    };

    const syncDataFromSheet = async (category: PerformanceCategory) => {
        if (!masterUrl || !currentUser) return;
        setIsGenerating(true);
        setStatusMsg('جاري الاتصال وسحب البيانات...');
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            if (sheetNames.length === 0) throw new Error("Excel file is empty");

            // Assuming data is in the first sheet
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);

            const keywords = getKeywordsForCategory(category);
            // Relaxed matching: Check if header contains any keyword (case insensitive)
            const matchedHeaders = headers.filter(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

            let newAssignmentsCount = 0;
            let updatedScoresCount = 0;
            const recordsToSave: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];

            // 1. Sync Columns (Assignments)
            // We need to fetch latest assignments inside the function to ensure we don't duplicate if called multiple times rapidly
            let currentAssignments = getAssignments(category, currentUser.id);
            
            // Helper to get or create assignment
            const getOrCreateAssignment = (headerTitle: string, idx: number): Assignment => {
                const { label, maxScore } = extractHeaderMetadata(headerTitle);
                
                // Try to find existing by Title exact match
                let existingAssign = currentAssignments.find(e => e.title.trim() === label.trim() || e.title.trim() === headerTitle.trim());
                
                if (existingAssign) return existingAssign;

                const newAssign: Assignment = {
                    id: `${category}_auto_${Date.now()}_${idx}`,
                    title: label,
                    category: category,
                    maxScore: maxScore,
                    isVisible: true,
                    orderIndex: currentAssignments.length + idx,
                    teacherId: currentUser.id
                };
                saveAssignment(newAssign);
                currentAssignments.push(newAssign); // Update local ref
                newAssignmentsCount++;
                return newAssign;
            };

            if (matchedHeaders.length > 0) {
                // 2. Sync Rows (Scores)
                data.forEach(row => {
                    // Try to find student match
                    const studentName = row['Student Name'] || row['اسم الطالب'] || row['الاسم'] || row['Name'];
                    const nationalId = row['National ID'] || row['رقم الهوية'] || row['السجل المدني'] || row['ID'];

                    let student: Student | undefined;
                    // Match by ID first (most accurate)
                    if (nationalId) student = students.find(s => s.nationalId === String(nationalId));
                    // Match by Name if ID failed
                    if (!student && studentName) student = students.find(s => s.name.trim() === String(studentName).trim());

                    if (student) {
                        matchedHeaders.forEach((header, idx) => {
                            const valRaw = row[header];
                            if (valRaw !== undefined && valRaw !== null && valRaw !== '') {
                                const val = parseFloat(valRaw);
                                if (!isNaN(val)) {
                                    const assignment = getOrCreateAssignment(header, idx);
                                    
                                    // Generate Record
                                    recordsToSave.push({
                                        id: `${student!.id}-${category}-${assignment.id}`, // Deterministic ID for Upsert
                                        studentId: student!.id,
                                        subject: selectedSubject,
                                        title: assignment.title,
                                        category: category,
                                        score: val,
                                        maxScore: assignment.maxScore,
                                        date: today,
                                        notes: assignment.id, // Links back to assignment
                                        createdById: currentUser.id
                                    });
                                    updatedScoresCount++;
                                }
                            }
                        });
                    }
                });

                // Batch Save
                if (recordsToSave.length > 0) {
                    onAddPerformance(recordsToSave);
                }

                // Refresh Assignments List in UI
                const updated = getAssignments(category, currentUser.id);
                updated.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                setAssignments(updated);

                setStatusMsg(`✅ تم: ${newAssignmentsCount} عمود جديد، ${updatedScoresCount} درجة محدثة.`);
            } else {
                setStatusMsg(`⚠️ لم يتم العثور على أعمدة. ابحث عن: ${keywords.slice(0,3).join(', ')}`);
            }
        } catch (e: any) {
            console.error("Auto-sync failed", e);
            setStatusMsg(`❌ فشل المزامنة: ${e.message}`);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setStatusMsg(''), 6000);
        }
    };

    const handleAutoSyncForTab = (tab: PerformanceCategory) => {
        syncDataFromSheet(tab);
    };

    useEffect(() => {
        // FIX: Fetch assignments including legacy/global ones by passing ID
        const allAssignments = getAssignments(activeTab, currentUser?.id);
        allAssignments.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setAssignments(allAssignments);
    }, [activeTab, masterUrl, activeMode, currentUser]);

    useEffect(() => {
        if (activeTab === 'YEAR_WORK') return;
        const newGrid: Record<string, Record<string, string>> = {};
        
        // Robust Grid Population: Link by ID (Notes) OR Title fallback
        performance.forEach(p => {
            if (p.category === activeTab && p.subject === selectedSubject) {
                // Strategy 1: Link by ID (stored in notes)
                const assignmentById = assignments.find(a => a.id === p.notes);
                
                if (assignmentById) {
                    if (!newGrid[p.studentId]) newGrid[p.studentId] = {};
                    newGrid[p.studentId][assignmentById.id] = p.score.toString();
                } else {
                    // Strategy 2: Link by Title (Legacy/Manual Name Matching)
                    const assignmentByTitle = assignments.find(a => a.title === p.title);
                    if (assignmentByTitle) {
                        if (!newGrid[p.studentId]) newGrid[p.studentId] = {};
                        newGrid[p.studentId][assignmentByTitle.id] = p.score.toString();
                    }
                }
            }
        });
        setGridData(newGrid);
    }, [performance, activeTab, selectedSubject, assignments]);

    const handleActivityTargetChange = (val: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            setActivityTarget(num);
            localStorage.setItem('works_activity_target', num.toString());
        }
    };

    const handleScoreChange = (studentId: string, assignId: string, val: string) => {
        setGridData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [assignId]: val }
        }));

        // Debounced Auto-Save
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setIsSaving(true);
        debounceTimerRef.current = setTimeout(() => {
            saveSpecificScore(studentId, assignId, val);
        }, 1000); // 1 second debounce
    };

    const saveSpecificScore = (studentId: string, assignId: string, val: string) => {
        if (activeTab === 'YEAR_WORK') return;
        const assignment = assignments.find(a => a.id === assignId);
        if (!assignment) return;

        const scoreVal = parseFloat(val);
        if (isNaN(scoreVal) && val !== '') return; 

        const today = new Date().toISOString().split('T')[0];
        
        // Construct single record
        const record: PerformanceRecord = {
            id: `${studentId}-${activeTab}-${assignId}`,
            studentId: studentId,
            subject: selectedSubject,
            title: assignment.title,
            category: activeTab,
            score: isNaN(scoreVal) ? 0 : scoreVal, 
            maxScore: assignment.maxScore,
            date: today,
            notes: assignment.id, 
            url: assignment.url,
            createdById: currentUser?.id 
        };

        onAddPerformance([record]);
        setIsSaving(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
    };

    const handleQuickFill = (assignId: string) => {
        if (!quickFillValue) return;
        const newVal = quickFillValue;
        
        // 1. Update UI
        setGridData(prev => {
            const next = { ...prev };
            students.forEach(s => {
                if (!next[s.id]) next[s.id] = {};
                next[s.id][assignId] = newVal;
            });
            return next;
        });

        // 2. Trigger Bulk Save
        setIsSaving(true);
        setTimeout(() => {
            const recordsToSave: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];
            const assignment = assignments.find(a => a.id === assignId);
            
            if (assignment) {
                const val = parseFloat(newVal);
                if(!isNaN(val)) {
                    students.forEach(student => {
                        recordsToSave.push({
                            id: `${student.id}-${activeTab}-${assignId}`,
                            studentId: student.id,
                            subject: selectedSubject,
                            title: assignment.title,
                            category: activeTab,
                            score: val,
                            maxScore: assignment.maxScore,
                            date: today,
                            notes: assignment.id, 
                            url: assignment.url,
                            createdById: currentUser?.id 
                        });
                    });
                    onAddPerformance(recordsToSave);
                }
            }
            setIsSaving(false);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        }, 500);

        setShowQuickFill(null);
        setQuickFillValue('');
    };

    // Manual Save Button (Backup)
    const handleSaveGrid = () => {
        if (activeTab === 'YEAR_WORK') return;
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        students.forEach(student => {
            assignments.forEach(assign => {
                if (assign.isVisible) {
                    const scoreVal = gridData[student.id]?.[assign.id];
                    if (scoreVal !== undefined && scoreVal !== '') {
                         const val = parseFloat(scoreVal);
                         if (!isNaN(val)) {
                            recordsToSave.push({
                                id: `${student.id}-${activeTab}-${assign.id}`,
                                studentId: student.id,
                                subject: selectedSubject,
                                title: assign.title,
                                category: activeTab,
                                score: val,
                                maxScore: assign.maxScore,
                                date: today,
                                notes: assign.id, 
                                url: assign.url,
                                createdById: currentUser?.id 
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
    };

    const handleAddColumn = () => {
        if (!currentUser) return;
        const newAssign: Assignment = {
            id: `manual_${Date.now()}`,
            title: 'عنوان جديد',
            category: activeTab,
            maxScore: 10,
            isVisible: true,
            url: '',
            orderIndex: assignments.length,
            teacherId: currentUser.id
        };
        saveAssignment(newAssign);
        setAssignments([...assignments, newAssign]);
    };

    const handleUpdateColumn = (index: number, field: keyof Assignment, value: any) => {
        const updated = [...assignments];
        updated[index] = { ...updated[index], [field]: value };
        setAssignments(updated);
    };

    const handleDeleteColumn = (index: number) => {
        if (confirm('هل أنت متأكد من حذف هذا النشاط؟ ستفقد الدرجات المرتبطة به.')) {
            const toDelete = assignments[index];
            deleteAssignment(toDelete.id);
            setAssignments(assignments.filter((_, i) => i !== index));
        }
    };

    const handleSaveConfig = () => {
        assignments.forEach(a => saveAssignment(a));
        setStatusMsg('✅ تم حفظ الإعدادات بنجاح.');
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students]);

    const renderStudentRow = (student: Student, i: number) => {
        const myAtt = attendance.filter(a => a.studentId === student.id);
        const absentCount = myAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const lowAttendance = absentCount > 3;

        const nameCell = (
            <td className="p-3 border-l font-bold text-gray-700 sticky right-0 bg-white z-10 shadow-sm border-r group-hover:bg-gray-50 flex items-center justify-between">
                <span>{student.name}</span>
                {lowAttendance && (
                    <span className="text-red-500" title={`تنبيه: ${absentCount} غياب`}>
                        <AlertTriangle size={14}/>
                    </span>
                )}
            </td>
        );

        if (activeTab === 'ACTIVITY') {
            let actSum = 0;
            assignments.filter(c => c.isVisible).forEach(col => {
                const val = parseFloat(gridData[student.id]?.[col.id] || '0');
                if(!col.title.includes('حضور') && !isNaN(val)) actSum += val;
            });
            const pct = activityTarget > 0 ? Math.round((actSum / activityTarget) * 100) : 0;
            
            return (
                <tr key={student.id} className="hover:bg-gray-50 border-b group">
                    <td className="p-3 border-l text-center bg-gray-50 text-gray-500">{i + 1}</td>
                    {nameCell}
                    {assignments.filter(c => c.isVisible).map(col => (
                        <td key={col.id} className="p-1 border-l text-center relative">
                            <input type="number" className="w-full h-full text-center p-2 outline-none focus:bg-blue-50 transition-colors bg-transparent min-w-[60px]" value={gridData[student.id]?.[col.id] || ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} placeholder="-" />
                            {col.url && <a href={col.url} target="_blank" rel="noreferrer" className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full hover:scale-150 transition-transform" title="رابط النشاط"></a>}
                        </td>
                    ))}
                    <td className="p-3 border-l text-center font-bold text-amber-700 bg-amber-50/30">{actSum}</td>
                    <td className="p-3 border-l text-center bg-orange-50/30"><span className="text-xs font-bold text-orange-800">{pct}%</span></td>
                </tr>
            );
        }

        if (activeTab === 'HOMEWORK') {
            const total = assignments.filter(c => c.isVisible).length;
            const completed = assignments.filter(c => c.isVisible && gridData[student.id]?.[c.id]).length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            return (
                <tr key={student.id} className="hover:bg-gray-50 border-b group">
                    <td className="p-3 border-l text-center bg-gray-50 text-gray-500">{i + 1}</td>
                    {nameCell}
                    {assignments.filter(c => c.isVisible).map(col => (
                        <td key={col.id} className="p-1 border-l text-center relative">
                            <input type="number" className="w-full h-full text-center p-2 outline-none focus:bg-blue-50 transition-colors bg-transparent min-w-[60px]" value={gridData[student.id]?.[col.id] || ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} placeholder="-" />
                            {col.url && <a href={col.url} target="_blank" rel="noreferrer" className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full hover:scale-150 transition-transform" title="رابط النشاط"></a>}
                        </td>
                    ))}
                    <td className="p-3 border-l text-center font-bold text-blue-600 bg-blue-50/30">{completed}</td>
                    <td className="p-3 border-l text-center bg-green-50/30"><span className="text-xs font-bold text-green-700">{pct}%</span></td>
                </tr>
            );
        }

        if (activeTab === 'PLATFORM_EXAM') {
            const scores = assignments.filter(c => c.isVisible).map(c => ({
                val: parseFloat(gridData[student.id]?.[c.id] || '0'),
                max: c.maxScore || 20
            }));
            let totalWeighted = 0;
            scores.forEach(s => { if (s.max > 0) totalWeighted += (s.val / s.max) * 20; });
            const finalWeighted = scores.length > 0 ? (totalWeighted / scores.length) : 0;

            return (
                <tr key={student.id} className="hover:bg-gray-50 border-b group">
                    <td className="p-3 border-l text-center bg-gray-50 text-gray-500">{i + 1}</td>
                    {nameCell}
                    {assignments.filter(c => c.isVisible).map(col => (
                        <td key={col.id} className="p-1 border-l text-center relative">
                            <input type="number" className="w-full h-full text-center p-2 outline-none focus:bg-blue-50 transition-colors bg-transparent min-w-[60px]" value={gridData[student.id]?.[col.id] || ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} placeholder="-" />
                            {col.url && <a href={col.url} target="_blank" rel="noreferrer" className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full hover:scale-150 transition-transform" title="رابط النشاط"></a>}
                        </td>
                    ))}
                    <td className="p-3 border-l text-center font-bold text-purple-700 bg-purple-50/30">{finalWeighted.toFixed(1)}</td>
                </tr>
            );
        }

        if (activeTab === 'YEAR_WORK') {
            const hwRecs = performance.filter(p => p.studentId === student.id && p.category === 'HOMEWORK' && p.subject === selectedSubject);
            const hwCols = getAssignments('HOMEWORK', currentUser?.id);
            const distinctHW = new Set(hwRecs.map(p => p.notes)).size;
            const hwGrade = hwCols.length > 0 ? (distinctHW / hwCols.length) * 10 : 0;

            const actRecs = performance.filter(p => p.studentId === student.id && p.category === 'ACTIVITY' && p.subject === selectedSubject);
            let actSumVal = 0;
            actRecs.forEach(p => { if (!p.title.includes('حضور')) actSumVal += p.score; });
            const actGrade = activityTarget > 0 ? Math.min((actSumVal / activityTarget) * 15, 15) : 0;

            const attRecs = attendance.filter(a => a.studentId === student.id);
            const present = attRecs.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
            const attGrade = attRecs.length > 0 ? (present / attRecs.length) * 15 : 15;

            const examRecs = performance.filter(p => p.studentId === student.id && p.category === 'PLATFORM_EXAM' && p.subject === selectedSubject);
            let examScoreTotal = 0;
            let examMaxTotal = 0;
            examRecs.forEach(p => { examScoreTotal += p.score; examMaxTotal += p.maxScore || 20; });
            const examGrade = examMaxTotal > 0 ? (examScoreTotal / examMaxTotal) * 20 : 0;

            const total = hwGrade + actGrade + attGrade + examGrade;

            return (
                <tr key={student.id} className="hover:bg-gray-50 border-b">
                    <td className="p-3 border-l text-center text-gray-500">{i + 1}</td>
                    {nameCell}
                    <td className="p-3 border-l text-center font-bold bg-blue-50/50">{hwGrade.toFixed(1)}</td>
                    <td className="p-3 border-l text-center font-bold bg-amber-50/50">{actGrade.toFixed(1)}</td>
                    <td className="p-3 border-l text-center font-bold bg-green-50/50">{attGrade.toFixed(1)}</td>
                    <td className="p-3 border-l text-center font-bold bg-purple-50/50">{examGrade.toFixed(1)}</td>
                    <td className="p-3 border-l text-center font-black text-white bg-gray-800">{total.toFixed(1)}</td>
                </tr>
            );
        }
        
        return null;
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col animate-fade-in relative bg-gray-50">
             <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-2">
                 <button onClick={() => setActiveMode('GRADING')} className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeMode === 'GRADING' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                     <Table size={18}/> <span className="hidden md:inline">رصد الدرجات</span><span className="md:hidden">الرصد</span>
                 </button>
                 <button onClick={() => setActiveMode('MANAGEMENT')} className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeMode === 'MANAGEMENT' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                     <Settings size={18}/> <span className="hidden md:inline">إعداد الأعمدة</span><span className="md:hidden">الإعدادات</span>
                 </button>
             </div>

             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {activeMode === 'GRADING' ? <List className="text-primary"/> : <PenTool className="text-purple-600"/>}
                        {activeMode === 'GRADING' ? 'سجل الرصد والمتابعة' : 'تخصيص الأعمدة والروابط'}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {/* Saving Status Indicator */}
                    {activeMode === 'GRADING' && (
                        <div className="text-xs font-bold px-3 py-1 bg-white border rounded-lg flex items-center gap-1 transition-all">
                            {isSaving ? (
                                <><Loader2 size={12} className="animate-spin text-blue-500"/> <span className="text-blue-500">جاري الحفظ...</span></>
                            ) : savedSuccess ? (
                                <><CheckCircle size={12} className="text-green-500"/> <span className="text-green-500">تم الحفظ</span></>
                            ) : (
                                <><Cloud size={12} className="text-gray-400"/> <span className="text-gray-400">الحفظ التلقائي مفعل</span></>
                            )}
                        </div>
                    )}

                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700 outline-none text-sm">
                        {subjects.length > 0 ? subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>) : <option value="عام">عام</option>}
                    </select>
                    {activeMode === 'GRADING' && activeTab !== 'YEAR_WORK' && (
                        <button onClick={handleSaveGrid} className="bg-green-600 text-white px-6 py-2 rounded-lg flex justify-center items-center gap-2 shadow-md transition-colors font-bold text-sm hover:bg-green-700">
                            {savedSuccess ? <CheckCircle size={18} /> : <Save size={18} />} {savedSuccess ? 'تم الحفظ' : 'حفظ'}
                        </button>
                    )}
                </div>
            </div>

            {activeMode === 'GRADING' && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col md:flex-row items-center gap-3 mb-6">
                    <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm"><LinkIcon size={16}/></div>
                    <div className="flex-1 w-full flex items-center gap-2">
                        {isEditingUrl || !masterUrl ? (
                            <>
                                <input className="flex-1 p-2 bg-white border rounded text-sm dir-ltr" placeholder="رابط ملف Excel (للمزامنة)..." value={masterUrl} onChange={e => setMasterUrl(e.target.value)} />
                                <button onClick={handleSaveMasterUrl} className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold">حفظ</button>
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <span className="text-sm text-blue-800 font-bold truncate dir-ltr">{masterUrl}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleAutoSyncForTab(activeTab)} disabled={isGenerating} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50">
                                        {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} تحديث البيانات
                                    </button>
                                    <button onClick={() => setIsEditingUrl(true)} className="p-1.5 text-gray-500 hover:text-blue-600"><Edit2 size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {statusMsg && <div className="mb-4 text-sm font-bold text-center bg-green-100 text-green-800 p-2 rounded-lg animate-pulse">{statusMsg}</div>}

            <div className="flex overflow-x-auto gap-2 border-b border-gray-200 mb-4 pb-1">
                {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => {
                    if (activeMode === 'MANAGEMENT' && cat === 'YEAR_WORK') return null; 
                    return (
                        <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === cat ? 'bg-white text-gray-800 border border-b-0 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                {cat === 'ACTIVITY' && <Activity size={16}/>}
                                {cat === 'HOMEWORK' && <List size={16}/>}
                                {cat === 'PLATFORM_EXAM' && <TrendingUp size={16}/>}
                                {cat === 'YEAR_WORK' && <Layout size={16}/>}
                                <span>{cat === 'ACTIVITY' ? 'الأنشطة' : cat === 'HOMEWORK' ? 'الواجبات' : cat === 'PLATFORM_EXAM' ? 'الاختبارات' : 'أعمال السنة'}</span>
                            </div>
                        </button>
                    )
                })}
            </div>

            {activeTab === 'ACTIVITY' && (
                <div className="flex justify-end mb-2">
                    <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                        <Target size={14} className="text-amber-600"/>
                        <span className="text-xs font-bold text-amber-800">هدف الأنشطة:</span>
                        <input type="number" min="1" value={activityTarget} onChange={(e) => handleActivityTargetChange(e.target.value)} className="w-12 p-1 text-center border rounded text-xs font-bold"/>
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white rounded-xl shadow border border-gray-200 relative min-h-[400px] flex flex-col overflow-hidden">
                {activeMode === 'MANAGEMENT' && (
                    <div className="p-6 flex-1 overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">إدارة الأعمدة</h3>
                            <button onClick={handleAddColumn} className="flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg font-bold text-xs hover:bg-purple-100">
                                <Plus size={16}/> إضافة عمود
                            </button>
                        </div>
                        <table className="w-full text-right border-collapse text-sm">
                            <thead className="bg-gray-50 font-bold border-b">
                                <tr>
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">العنوان</th>
                                    <th className="p-3 w-24">الدرجة</th>
                                    <th className="p-3">الرابط (URL)</th>
                                    <th className="p-3 w-20 text-center">عرض</th>
                                    <th className="p-3 w-20 text-center">حذف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {assignments.map((col, index) => (
                                    <tr key={col.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center text-gray-400">{index + 1}</td>
                                        <td className="p-3"><input className="w-full p-2 border rounded font-bold" value={col.title} onChange={(e) => handleUpdateColumn(index, 'title', e.target.value)} /></td>
                                        <td className="p-3"><input type="number" className="w-full p-2 border rounded text-center" value={col.maxScore} onChange={(e) => handleUpdateColumn(index, 'maxScore', e.target.value)} /></td>
                                        <td className="p-3 relative">
                                            <input className="w-full p-2 border rounded dir-ltr text-left pl-8 text-blue-600" value={col.url || ''} onChange={(e) => handleUpdateColumn(index, 'url', e.target.value)} placeholder="https://..." />
                                            <LinkIcon size={14} className="absolute left-3 top-3 text-gray-400"/>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleUpdateColumn(index, 'isVisible', !col.isVisible)} className={`p-2 rounded-full ${col.isVisible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {col.isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleDeleteColumn(index)} className="p-2 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-6 flex justify-end border-t pt-4">
                            <button onClick={handleSaveConfig} className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black flex items-center gap-2"><Save size={16}/> حفظ التغييرات</button>
                        </div>
                    </div>
                )}

                {activeMode === 'GRADING' && (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right text-sm border-collapse whitespace-nowrap">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm font-bold text-gray-700">
                                <tr>
                                    <th className="p-3 border-b border-l w-12 text-center bg-gray-100">#</th>
                                    <th className="p-3 border-b border-l min-w-[200px] sticky right-0 z-20 bg-gray-100 shadow-md">اسم الطالب</th>
                                    {activeTab !== 'YEAR_WORK' && assignments.filter(c => c.isVisible).map(col => (
                                        <th key={col.id} className="p-2 border-b border-l min-w-[100px] text-center relative group bg-white hover:bg-gray-50 transition-colors">
                                            <div className="flex flex-col items-center">
                                                <div className="text-xs mb-1">{col.title}</div>
                                                <div className="text-[10px] text-gray-400">({col.maxScore})</div>
                                            </div>
                                            <button 
                                                onClick={() => setShowQuickFill(col.id)} 
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-purple-600 hover:bg-purple-100 rounded"
                                                title="تعبئة تلقائية"
                                            >
                                                <Zap size={10}/>
                                            </button>
                                            
                                            {showQuickFill === col.id && (
                                                <div className="absolute top-full left-0 right-0 bg-white border shadow-lg rounded p-2 z-30 flex flex-col gap-2 animate-fade-in">
                                                    <input 
                                                        autoFocus
                                                        className="w-full border rounded p-1 text-xs text-center" 
                                                        placeholder="القيمة" 
                                                        value={quickFillValue}
                                                        onChange={e => setQuickFillValue(e.target.value)}
                                                    />
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleQuickFill(col.id)} className="flex-1 bg-purple-600 text-white text-[10px] rounded py-1">تعبئة</button>
                                                        <button onClick={() => setShowQuickFill(null)} className="bg-gray-200 text-gray-600 text-[10px] rounded px-2">X</button>
                                                    </div>
                                                </div>
                                            )}

                                            {col.url && <a href={col.url} target="_blank" rel="noreferrer" className="absolute top-1 left-1 text-blue-400 hover:text-blue-600"><ExternalLink size={10}/></a>}
                                        </th>
                                    ))}
                                    {activeTab === 'ACTIVITY' && (
                                        <>
                                            <th className="p-3 border-b border-l min-w-[80px] text-center bg-amber-50 text-amber-800">المجموع</th>
                                            <th className="p-3 border-b border-l min-w-[100px] text-center bg-orange-50 text-orange-800">النسبة %</th>
                                        </>
                                    )}
                                    {activeTab === 'HOMEWORK' && (
                                        <>
                                            <th className="p-3 border-b border-l min-w-[80px] text-center bg-blue-50 text-blue-800">مكتمل</th>
                                            <th className="p-3 border-b border-l min-w-[100px] text-center bg-green-50 text-green-800">الإنجاز %</th>
                                        </>
                                    )}
                                    {activeTab === 'PLATFORM_EXAM' && <th className="p-3 border-b border-l min-w-[100px] text-center bg-purple-50 text-purple-800">الموزونة (20)</th>}
                                    {activeTab === 'YEAR_WORK' && (
                                        <>
                                            <th className="p-3 border-b border-l bg-blue-50 text-blue-900 text-center">الواجبات (10)</th>
                                            <th className="p-3 border-b border-l bg-amber-50 text-amber-900 text-center">الأنشطة (15)</th>
                                            <th className="p-3 border-b border-l bg-green-50 text-green-900 text-center">المشاركة (15)</th>
                                            <th className="p-3 border-b border-l bg-purple-50 text-purple-900 text-center">المنصة (20)</th>
                                            <th className="p-3 border-b border-l bg-gray-800 text-white text-center">المجموع (60)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStudents.map((student, i) => renderStudentRow(student, i))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorksTracking;
