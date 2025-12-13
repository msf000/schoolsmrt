import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const IGNORED_COLUMNS = [
    'name', 'id', 'class', 'grade', 'student', 'section', 'email', 'phone', 'mobile', 'gender', 'national', 'date', 'time', 'timestamp',
    'الاسم', 'اسم', 'الطالب', 'طالب', 'الفصل', 'الصف', 'الهوية', 'السجل', 'المدني', 'الجوال', 'هاتف', 'بريد', 'ملاحظات', 'ملاحظة', 'جنس', 'تاريخ',
    'note', 'nationalid', 'student_name', 'full_name', 'الاسم الثلاثي', 'الاسم الرباعي'
];

const STUDENT_NAME_HEADERS = [
    'الاسم', 'اسم', 'اسم الطالب', 'الطالب', 'اسمك', 'لطالب', 
    'الاسم الثلاثي', 'الاسم الرباعي', 'الاسم الكامل',
    'name', 'student', 'student name', 'full name', 'student_name'
];

const DEFAULT_CATEGORIES = [
    { id: 'HOMEWORK', label: 'الواجبات' },
    { id: 'ACTIVITY', label: 'الأنشطة' },
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' },
];

const CATEGORY_LABELS: Record<string, string> = {
    'HOMEWORK': 'الواجبات',
    'ACTIVITY': 'الأنشطة',
    'PLATFORM_EXAM': 'الاختبارات',
    'YEAR_WORK': 'أعمال السنة',
    'OTHER': 'عام'
};

interface SyncDiff {
    type: 'NEW_SCORE' | 'UPDATE_SCORE' | 'DELETE_SCORE' | 'NEW_COLUMN';
    details: string;
    studentName?: string;
    oldVal?: string | number;
    newVal?: string | number;
    record?: PerformanceRecord; 
    assignment?: Assignment; 
}

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    // Updated to string to support custom tabs
    const [activeTab, setActiveTab] = useState<string>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return saved || 'HOMEWORK';
    });

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
    }, [activeTab]);
    
    // --- Persisted Filter State ---
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    
    // Save filters when changed
    useEffect(() => localStorage.setItem('works_term_id', selectedTermId), [selectedTermId]);
    useEffect(() => localStorage.setItem('works_period_id', selectedPeriodId), [selectedPeriodId]);
    useEffect(() => localStorage.setItem('works_subject', selectedSubject), [selectedSubject]);
    useEffect(() => localStorage.setItem('works_class', selectedClass), [selectedClass]);

    const [searchTerm, setSearchTerm] = useState('');

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [syncStatusMsg, setSyncStatusMsg] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
    const [activityTarget, setActivityTarget] = useState(15);

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncDiffs, setSyncDiffs] = useState<SyncDiff[]>([]);

    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 10, att: 5, exam: 20
    });

    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    
    // Independent state for Settings Modal
    const [settingTermId, setSettingTermId] = useState('');
    const [settingPeriodId, setSettingPeriodId] = useState('');
    
    // -- Import Category State --
    const [importCategory, setImportCategory] = useState<string>('HOMEWORK');
    const [customImportCategory, setCustomImportCategory] = useState('');
    
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]); // Store raw data to calc max scores
    const [selectedHeaders, setSelectedHeaders] = useState<Set<string>>(new Set());
    const [unmatchedStudents, setUnmatchedStudents] = useState<string[]>([]);
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [syncStep, setSyncStep] = useState<'URL' | 'SELECTION'>('URL');

    // -- Settings Modal State --
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColUrl, setNewColUrl] = useState(''); // NEW: URL for manual column
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');
    const [newCustomCategory, setNewCustomCategory] = useState(''); // For Manual
    
    // -- Local State for Sheet Column Overrides --
    const [sheetColMaxScores, setSheetColMaxScores] = useState<Record<string, string>>({});
    const [sheetColUrls, setSheetColUrls] = useState<Record<string, string>>({}); // NEW: URLs for sheet columns

    useEffect(() => {
        const syncData = async () => {
            // Disabled auto-refresh to prevent data conflicts
            // setIsRefreshing(true);
            // await forceRefreshData();
            const savedUrl = getWorksMasterUrl();
            // Optional: Auto-sync from Google Sheet only if configured (less risky than full DB sync)
            if (savedUrl) setTimeout(() => handleQuickSheetSync(true), 1000);
            setIsRefreshing(false);
        };
        syncData();
    }, []);

    const findStudentNameInRow = (row: any): string | undefined => {
        for (const key of STUDENT_NAME_HEADERS) {
            if (row[key]) return String(row[key]);
        }
        const rowKeys = Object.keys(row);
        for (const key of rowKeys) {
            const lowerKey = key.toLowerCase().trim();
            if (STUDENT_NAME_HEADERS.some(h => lowerKey === h || lowerKey.includes(h))) {
                return String(row[key]);
            }
        }
        return undefined;
    };

    const fetchAssignments = useCallback((category: string) => {
        return getAssignments(category === 'YEAR_WORK' ? 'ALL' : category, currentUser?.id, isManager);
    }, [currentUser, isManager]);

    const handleQuickSheetSync = useCallback(async (isAuto = false) => {
        if (!googleSheetUrl) return;
        setIsSheetSyncing(true);
        setSyncStatusMsg('جاري الاتصال بـ Google Sheet...');

        try {
            const { workbook } = await fetchWorkbookStructureUrl(googleSheetUrl);
            const linkedAssignments = assignments.filter(a => a.sourceMetadata);
            
            if (linkedAssignments.length === 0) {
                if(!isAuto) alert('لا توجد أعمدة مرتبطة بملف Google Sheet. قم بربط الأعمدة أولاً من الإعدادات.');
                setIsSheetSyncing(false);
                return;
            }

            const assignmentsBySheet: Record<string, Assignment[]> = {};
            linkedAssignments.forEach(a => {
                try {
                    const meta = JSON.parse(a.sourceMetadata!);
                    const sheet = meta.sheet;
                    if (!assignmentsBySheet[sheet]) assignmentsBySheet[sheet] = [];
                    assignmentsBySheet[sheet].push(a);
                } catch (e) { console.error("Invalid metadata", a); }
            });

            const newRecords: PerformanceRecord[] = [];
            let updatedCount = 0;

            for (const sheetName of Object.keys(assignmentsBySheet)) {
                if (!workbook.SheetNames.includes(sheetName)) continue;

                const { data } = getSheetHeadersAndData(workbook, sheetName);
                const sheetAssignments = assignmentsBySheet[sheetName];

                for (const row of data) {
                    const identifier = findStudentNameInRow(row); 
                    if (!identifier) continue;

                    const student = students.find(s => 
                        s.name === identifier || 
                        s.nationalId === identifier ||
                        s.name.includes(identifier)
                    );

                    if (student) {
                        sheetAssignments.forEach(assign => {
                            const meta = JSON.parse(assign.sourceMetadata!);
                            const header = meta.header;
                            const rawVal = row[header];

                            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                                const numVal = parseFloat(rawVal);
                                if (!isNaN(numVal)) {
                                    newRecords.push({
                                        id: `${student.id}_${assign.id}`, 
                                        studentId: student.id,
                                        subject: selectedSubject || 'عام',
                                        title: assign.title,
                                        category: assign.category,
                                        score: numVal,
                                        maxScore: assign.maxScore,
                                        date: new Date().toISOString().split('T')[0],
                                        notes: assign.id,
                                        createdById: currentUser?.id
                                    });
                                    updatedCount++;
                                }
                            }
                        });
                    }
                }
            }

            if (newRecords.length > 0) {
                onAddPerformance(newRecords);
                if(!isAuto) alert(`تم تحديث ${updatedCount} درجة بنجاح من الملف!`);
            } else {
                if(!isAuto) alert('لم يتم العثور على درجات جديدة أو مطابقة للطلاب.');
            }

        } catch (e: any) {
            console.error(e);
            if(!isAuto) alert(`فشل التحديث: ${e.message}`);
        } finally {
            setIsSheetSyncing(false);
            setSyncStatusMsg('');
        }
    }, [googleSheetUrl, assignments, students, selectedSubject, currentUser, onAddPerformance]);

    useEffect(() => {
        if (currentUser) {
            const subs = getSubjects(currentUser.id);
            setSubjects(subs);
            
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setGoogleSheetUrl(savedUrl);

            const savedConfig = localStorage.getItem('works_year_config');
            if (savedConfig) setYearWorkConfig(JSON.parse(savedConfig));

            // Only set defaults if no persisted state
            if (!localStorage.getItem('works_term_id')) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) {
                    setSelectedTermId(current.id);
                    setSettingTermId(current.id); 
                } else if (loadedTerms.length > 0) {
                    setSelectedTermId(loadedTerms[0].id);
                    setSettingTermId(loadedTerms[0].id);
                }
            } else {
                // Also sync settings to selected
                setSettingTermId(selectedTermId);
            }

            if (!localStorage.getItem('works_subject') && subs.length > 0) {
                setSelectedSubject(subs[0].name);
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId]);

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        DEFAULT_CATEGORIES.forEach(c => cats.add(c.id));
        assignments.forEach(a => {
            if (a.category && a.category !== 'YEAR_WORK') cats.add(a.category);
        });
        return Array.from(cats);
    }, [assignments]);

    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        
        filtered.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => 
                p.studentId === s.id && 
                p.subject === selectedSubject &&
                (activeTab === 'YEAR_WORK' || p.category === activeTab)
            );

            studentPerf.forEach(p => {
                // Robust matching: Try ID match first (p.notes === assignment.id), then Title Match
                if (p.notes && assignments.some(a => a.id === p.notes)) { 
                     newScores[s.id][p.notes] = p.score.toString();
                } else { 
                     const assign = assignments.find(a => a.title === p.title);
                     if (assign) {
                         newScores[s.id][assign.id] = p.score.toString();
                     }
                }
            });
        });
        setScores(newScores);
    }, [students, selectedClass, performance, selectedSubject, activeTab, assignments]);

    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [assignmentId]: val }
        }));

        if (autoSaveEnabled) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                handleSaveScores(true); 
            }, 2000); 
        }
    };

    const handleSaveScores = (silent = false) => {
        if (!selectedSubject) {
            if(!silent) alert('الرجاء اختيار المادة');
            return;
        }
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const val = scores[studentId][assignmentId];
                if (val !== undefined && val !== '') {
                    const assignment = assignments.find(a => a.id === assignmentId);
                    if (assignment) {
                        const existingRecord = performance.find(p => p.studentId === studentId && (p.notes === assignmentId || p.title === assignment.title));
                        
                        if (!existingRecord || existingRecord.score !== parseFloat(val)) {
                            recordsToSave.push({
                                id: existingRecord ? existingRecord.id : `${studentId}_${assignmentId}`,
                                studentId,
                                subject: selectedSubject,
                                title: assignment.title,
                                category: assignment.category,
                                score: parseFloat(val),
                                maxScore: assignment.maxScore,
                                date: existingRecord ? existingRecord.date : today,
                                notes: assignment.id,
                                createdById: currentUser?.id
                            });
                        }
                    }
                }
            });
        });

        if (recordsToSave.length > 0) {
            onAddPerformance(recordsToSave);
            setLastSaved(new Date());
        }
        
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        await forceRefreshData();
        const savedUrl = getWorksMasterUrl();
        if (savedUrl) await handleQuickSheetSync(true);
        setIsRefreshing(false);
    };

    const handleAddColumn = () => {
        if (!newColTitle) return;
        const categoryToUse = newColCategory === 'CUSTOM' ? newCustomCategory : newColCategory;
        if (!categoryToUse) return;

        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: newColTitle,
            category: categoryToUse,
            maxScore: Number(newColMax),
            url: newColUrl,
            isVisible: true,
            teacherId: currentUser?.id,
            termId: settingTermId || selectedTermId,
            periodId: settingPeriodId || selectedPeriodId
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        setNewColTitle('');
        setNewColUrl('');
        setNewCustomCategory('');
    };

    const handleDeleteColumn = (id: string) => {
        if(confirm('حذف هذا العمود والدرجات المرتبطة به؟')) {
            deleteAssignment(id);
            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        }
    };

    const handleUpdateColumn = (a: Assignment) => {
        saveAssignment(a);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
    };

    const handleFetchSheetHeaders = async () => {
        if (!googleSheetUrl) return;
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            if (sheetNames.length > 0) {
                setSelectedSheetName(sheetNames[0]);
                const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
                setAvailableHeaders(headers);
                setSheetData(data);
                setSheetColMaxScores({});
                setSheetColUrls({});
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsFetchingStructure(false);
        }
    };

    const handleSheetSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sheet = e.target.value;
        setSelectedSheetName(sheet);
        if (workbookRef) {
            const { headers, data } = getSheetHeadersAndData(workbookRef, sheet);
            setAvailableHeaders(headers);
            setSheetData(data);
            setSheetColMaxScores({});
            setSheetColUrls({});
        }
    };

    const getColumnMaxScore = (header: string): number => {
        if (!sheetData || sheetData.length === 0) return 10;
        let max = 0;
        sheetData.forEach(row => {
            const val = parseFloat(row[header]);
            if (!isNaN(val) && val > max) max = val;
        });
        return max > 0 ? max : 10;
    };

    const handleImportColumnFromSheet = (header: string, manualMax?: string, manualUrl?: string) => {
        const categoryToUse = importCategory === 'CUSTOM' ? customImportCategory : importCategory;
        if (!categoryToUse) {
            alert('الرجاء تحديد تصنيف العمود (التبويب) أولاً');
            return;
        }

        const calculatedMax = getColumnMaxScore(header);
        const finalMax = manualMax ? Number(manualMax) : calculatedMax;

        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: header,
            category: categoryToUse, 
            maxScore: finalMax,
            url: manualUrl, 
            isVisible: true,
            teacherId: currentUser?.id,
            sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header }),
            termId: settingTermId || selectedTermId,
            periodId: settingPeriodId || selectedPeriodId
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        alert(`تم إضافة العمود "${header}" (درجة عظمى: ${finalMax}) إلى تبويب: ${CATEGORY_LABELS[categoryToUse] || categoryToUse}`);
    };

    const saveYearWorkSettings = () => {
        localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig));
        alert('تم حفظ توزيع الدرجات بنجاح');
    };

    // --- Year Work Calculation Logic ---
    const calculateYearWork = (student: Student) => {
        // 1. Identify Valid Assignments for Selected Term & Period
        const relevantAssignments = assignments.filter(a => {
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId;
            return termMatch && periodMatch;
        });
        
        const relevantAssignmentIds = new Set(relevantAssignments.map(a => a.id));

        // 2. Identify Valid Date Range for Attendance
        const activeTerm = terms.find(t => t.id === selectedTermId);
        let dateStart = activeTerm?.startDate;
        let dateEnd = activeTerm?.endDate;

        if (selectedPeriodId && activeTerm?.periods) {
            const p = activeTerm.periods.find(p => p.id === selectedPeriodId);
            if (p) {
                dateStart = p.startDate;
                dateEnd = p.endDate;
            }
        }

        // 3. Filter performance records: Link STRICTLY to Assignment ID or Title
        const studentPerf = performance.filter(p => {
            if (p.studentId !== student.id || p.subject !== selectedSubject) return false;
            
            // Check direct ID link first (notes field often stores assignment ID)
            if (p.notes && relevantAssignmentIds.has(p.notes)) return true;
            
            // Fallback: Check Title matching (legacy support)
            return relevantAssignments.some(a => a.title === p.title);
        });

        // 1. Homework
        const hwCols = relevantAssignments.filter(a => a.category === 'HOMEWORK');
        let hwTotalScore = 0;
        let hwTotalMax = 0;
        hwCols.forEach(col => {
            const p = studentPerf.find(r => r.notes === col.id || r.title === col.title);
            if (p) {
                hwTotalScore += p.score;
                hwTotalMax += p.maxScore;
            } else {
                hwTotalMax += col.maxScore; 
            }
        });
        const hwGrade = hwTotalMax > 0 ? (hwTotalScore / hwTotalMax) * yearWorkConfig.hw : 0;

        // 2. Activity
        const actCols = relevantAssignments.filter(a => a.category === 'ACTIVITY');
        let actTotalScore = 0;
        let actTotalMax = 0;
        actCols.forEach(col => {
            const p = studentPerf.find(r => r.notes === col.id || r.title === col.title);
            if (p) {
                actTotalScore += p.score;
                actTotalMax += p.maxScore;
            } else {
                actTotalMax += col.maxScore;
            }
        });
        const actGrade = actTotalMax > 0 ? (actTotalScore / actTotalMax) * yearWorkConfig.act : 0;

        // 3. Exams
        const examCols = relevantAssignments.filter(a => a.category === 'PLATFORM_EXAM');
        let examTotalScore = 0;
        let examTotalMax = 0;
        examCols.forEach(col => {
            const p = studentPerf.find(r => r.notes === col.id || r.title === col.title);
            if (p) {
                examTotalScore += p.score;
                examTotalMax += p.maxScore;
            } else {
                examTotalMax += col.maxScore;
            }
        });
        const examGrade = examTotalMax > 0 ? (examTotalScore / examTotalMax) * yearWorkConfig.exam : 0;

        // 4. Attendance (Still Time-Based)
        let studentAtt = attendance.filter(a => a.studentId === student.id && (!selectedSubject || a.subject === selectedSubject));
        
        if (dateStart && dateEnd) {
            studentAtt = studentAtt.filter(a => a.date >= dateStart! && a.date <= dateEnd!);
        }

        const totalDays = studentAtt.length;
        const presentDays = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
        
        const attGrade = totalDays > 0 ? (presentDays / totalDays) * yearWorkConfig.att : (totalDays === 0 ? yearWorkConfig.att : 0);

        const total = hwGrade + actGrade + examGrade + attGrade;

        return { 
            hwGrade: Math.round(hwGrade * 10) / 10,
            actGrade: Math.round(actGrade * 10) / 10,
            examGrade: Math.round(examGrade * 10) / 10,
            attGrade: Math.round(attGrade * 10) / 10,
            total: Math.round(total * 10) / 10,
            hwCompletion: hwTotalMax > 0 ? Math.round((hwTotalScore/hwTotalMax)*100) : 0,
            actCompletion: actTotalMax > 0 ? Math.round((actTotalScore/actTotalMax)*100) : 0
        };
    };

    const handleExport = () => {
        // ... (Existing export logic)
    };

    const activeTerm = terms.find(t => t.id === selectedTermId);
    
    const activePeriods = useMemo(() => {
        if (!activeTerm?.periods) return [];
        return [...activeTerm.periods].sort((a, b) => {
            const dateA = a.startDate || '';
            const dateB = b.startDate || '';
            if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
            return a.name.localeCompare(b.name, 'ar');
        });
    }, [activeTerm]);
    
    const settingsTermObj = terms.find(t => t.id === settingTermId);
    const settingsPeriods = useMemo(() => {
        if (!settingsTermObj?.periods) return [];
        return [...settingsTermObj.periods].sort((a, b) => {
            const dateA = a.startDate || '';
            const dateB = b.startDate || '';
            if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
            return a.name.localeCompare(b.name, 'ar');
        });
    }, [settingsTermObj]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        return Array.from(classes).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));
        return filtered.sort((a,b) => {
            if (a.className === b.className) return a.name.localeCompare(b.name);
            return (a.className || '').localeCompare(b.className || '');
        });
    }, [students, selectedClass, searchTerm]);

    const filteredAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => {
            const termMatch = !selectedTermId || (a.termId === selectedTermId);
            // STRICT PERIOD FILTER
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId;
            const categoryMatch = a.category === activeTab;
            return termMatch && periodMatch && categoryMatch;
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [assignments, selectedTermId, selectedPeriodId, activeTab]);

    const settingsAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => {
            const termMatch = !settingTermId || a.termId === settingTermId;
            const periodMatch = !settingPeriodId || a.periodId === settingPeriodId;
            return termMatch && periodMatch;
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [assignments, settingTermId, settingPeriodId, activeTab]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            {/* Sync Indicator */}
            {isRefreshing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse text-sm font-bold">
                    <RefreshCw size={16} className="animate-spin"/> جاري تحديث البيانات من السحابة...
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
                {/* Header Controls (Existing) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل الرصد والمتابعة</h2>
                        {/* Auto Save Toggle */}
                        {activeTab !== 'YEAR_WORK' && (
                            <div 
                                className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-colors text-xs font-bold ${autoSaveEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                            >
                                <div className={`w-3 h-3 rounded-full ${autoSaveEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {autoSaveEnabled ? 'الحفظ التلقائي مفعل' : 'الحفظ التلقائي معطل'}
                            </div>
                        )}
                        {isSaving && <span className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> جاري الحفظ...</span>}
                        {!isSaving && lastSaved && <span className="text-[10px] text-gray-400">آخر حفظ: {lastSaved.toLocaleTimeString()}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1">
                            <Calendar size={16} className="text-gray-400 ml-2"/>
                            <select className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[120px]" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                                <option value="">كل الفترات</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {activePeriods.length > 0 && (
                            <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1">
                                <span className="text-xs text-gray-400 ml-1">الفترة:</span>
                                <select className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                                    <option value="">الكل (عام)</option>
                                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold min-w-[120px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            <option value="">-- المادة --</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">كل الفصول</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Sub Header & Buttons (Dynamic Tabs) */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-[80%]">
                        {availableCategories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setActiveTab(cat)} 
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === cat ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                {CATEGORY_LABELS[cat] || cat}
                            </button>
                        ))}
                        <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'YEAR_WORK' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>أعمال السنة (تجميعي)</button>
                    </div>

                    <div className="flex gap-2">
                        {googleSheetUrl && (
                            <button 
                                onClick={() => handleQuickSheetSync(false)} 
                                disabled={isSheetSyncing}
                                className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200"
                                title="تحديث الدرجات من ملف Google Sheet المرتبط"
                            >
                                {isSheetSyncing ? <Loader2 size={16} className="animate-spin"/> : <CloudLightning size={16}/>} 
                                تحديث من الملف
                            </button>
                        )}
                        <button onClick={() => { setIsSettingsOpen(true); setSettingTermId(selectedTermId || ''); }} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                            <Settings size={16}/> إعدادات {activeTab === 'YEAR_WORK' ? 'توزيع الدرجات' : 'الأعمدة'}
                        </button>
                        {activeTab !== 'YEAR_WORK' && (
                            <button onClick={() => handleSaveScores(false)} disabled={isSaving} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md">
                                {isSaving ? <Settings size={16} className="animate-spin"/> : <Save size={16}/>} حفظ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            {filteredStudents.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-l w-12 bg-gray-50">#</th>
                                    <th className="p-3 border-l w-64 text-right bg-gray-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                    {!selectedClass && <th className="p-3 border-l w-32 bg-gray-50">الفصل</th>}
                                    
                                    {activeTab === 'YEAR_WORK' ? (
                                        <>
                                            <th className="p-3 border-l bg-blue-50 text-blue-800">واجبات ({yearWorkConfig.hw})</th>
                                            <th className="p-3 border-l bg-blue-50 text-blue-600 font-normal">% الإنجاز</th>
                                            <th className="p-3 border-l bg-amber-50 text-amber-800">أنشطة ({yearWorkConfig.act})</th>
                                            <th className="p-3 border-l bg-amber-50 text-amber-600 font-normal">% الإنجاز</th>
                                            <th className="p-3 border-l bg-green-50 text-green-800">حضور ({yearWorkConfig.att})</th>
                                            <th className="p-3 border-l bg-purple-50 text-purple-800">اختبارات ({yearWorkConfig.exam})</th>
                                            <th className="p-3 border-l bg-gray-800 text-white">المجموع ({yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam})</th>
                                        </>
                                    ) : (
                                        <>
                                            {(activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') && (
                                                <>
                                                    <th className="p-2 border-l w-24 bg-gray-100 font-bold text-gray-600">% الإنجاز</th>
                                                    <th className="p-2 border-l w-24 bg-gray-200 font-bold text-gray-800">المجموع</th>
                                                </>
                                            )}
                                            {filteredAssignments.map(assign => (
                                                <th key={assign.id} className="p-2 border-l min-w-[120px] group relative">
                                                    <div className="flex flex-col items-center">
                                                        <span className="flex items-center gap-1">
                                                            {assign.title}
                                                            {assign.url && <a href={assign.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="فتح الرابط"><Link2 size={12}/></a>}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 bg-white px-1 rounded border">Max: {assign.maxScore}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => {
                                    // Check if student is ABSENT today
                                    const today = new Date().toISOString().split('T')[0];
                                    const isAbsent = attendance.some(a => a.studentId === student.id && a.date === today && a.status === AttendanceStatus.ABSENT);

                                    // Render Year Work Row
                                    if (activeTab === 'YEAR_WORK') {
                                        const yearStats = calculateYearWork(student);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 border-b">
                                                <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                                <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10">{student.name}</td>
                                                {!selectedClass && <td className="p-3 border-l text-gray-500 text-xs">{student.className}</td>}
                                                
                                                <td className="p-3 border-l text-blue-700 font-bold">{yearStats.hwGrade}</td>
                                                <td className="p-3 border-l text-blue-500 text-xs">{yearStats.hwCompletion}%</td>
                                                
                                                <td className="p-3 border-l text-amber-700 font-bold">{yearStats.actGrade}</td>
                                                <td className="p-3 border-l text-amber-500 text-xs">{yearStats.actCompletion}%</td>
                                                
                                                <td className="p-3 border-l text-green-700 font-bold">{yearStats.attGrade}</td>
                                                <td className="p-3 border-l text-purple-700 font-bold">{yearStats.examGrade}</td>
                                                
                                                <td className="p-3 border-l font-black text-gray-900 bg-gray-100">{yearStats.total}</td>
                                            </tr>
                                        );
                                    }

                                    // Render Standard Row (Homework/Exams/etc)
                                    let completionRate = 0;
                                    let totalScore = 0;
                                    let totalMax = 0;

                                    if (activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') {
                                        filteredAssignments.forEach(a => {
                                            const rawVal = scores[student.id]?.[a.id];
                                            if (rawVal !== undefined && rawVal !== '') {
                                                if (!isNaN(parseFloat(rawVal))) {
                                                    totalScore += parseFloat(rawVal);
                                                }
                                            }
                                            totalMax += a.maxScore;
                                        });
                                        completionRate = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
                                    }

                                    return (
                                        <tr key={student.id} className={`hover:bg-gray-50 border-b transition-colors ${isAbsent ? 'bg-red-50/40' : ''}`}>
                                            <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                            <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm flex items-center justify-between">
                                                <span>{student.name}</span>
                                                {isAbsent && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold mr-2 border border-red-200">غائب</span>}
                                            </td>
                                            {!selectedClass && <td className="p-3 border-l text-gray-500 text-xs">{student.className}</td>}
                                            
                                            {/* Completion & Total Columns */}
                                            {(activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') && (
                                                <>
                                                    <td className="p-3 border-l">
                                                        <span className={`px-2 py-1 rounded font-bold text-xs ${completionRate >= 80 ? 'bg-green-100 text-green-700' : completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                            {completionRate}%
                                                        </span>
                                                    </td>
                                                    <td className="p-3 border-l font-bold text-gray-800 bg-gray-50">
                                                        {totalScore} <span className="text-gray-400 text-[10px]">/ {totalMax}</span>
                                                    </td>
                                                </>
                                            )}

                                            {filteredAssignments.map(assign => (
                                                <td key={assign.id} className="p-0 border-l relative h-10">
                                                    <input 
                                                        type="number"
                                                        className={`w-full h-full p-2 text-center outline-none bg-transparent focus:bg-indigo-50 font-medium ${scores[student.id]?.[assign.id] ? 'text-indigo-700 font-bold' : 'text-gray-400'} ${isAbsent && scores[student.id]?.[assign.id] ? 'ring-2 ring-red-300' : ''}`}
                                                        value={scores[student.id]?.[assign.id] || ''}
                                                        onChange={e => handleScoreChange(student.id, assign.id, e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && <div className="p-10 text-center text-gray-400">لا يوجد طلاب في هذا الفصل</div>}
                        {activeTab !== 'YEAR_WORK' && filteredAssignments.length === 0 && <div className="p-10 text-center text-gray-400">لم تقم بإضافة أي أعمدة (واجبات/اختبارات). اضغط "إعدادات الأعمدة"</div>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <Table size={48} className="mb-4 opacity-20"/>
                    <p>لا توجد بيانات للعرض. تأكد من اختيار الفلتر المناسب.</p>
                </div>
            )}

            {/* SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-bounce-in overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> إدارة الأعمدة والربط</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        
                        <div className="flex border-b">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'MANUAL' ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>توزيع أعمال السنة</button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50">
                            {/* --- MANUAL TAB --- */}
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    {/* TERM & PERIOD SELECTOR (Target Context) */}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-wrap gap-4 items-center">
                                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1"><ListFilter size={14}/> السياق الحالي (للعرض والإضافة):</span>
                                        <select 
                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                            value={settingTermId} 
                                            onChange={e => { setSettingTermId(e.target.value); setSettingPeriodId(''); }}
                                        >
                                            <option value="">اختر الفصل...</option>
                                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <select 
                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                            value={settingPeriodId} 
                                            onChange={e => setSettingPeriodId(e.target.value)}
                                        >
                                            <option value="">الفترة (عام)</option>
                                            {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Add New Column Form */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">عنوان العمود (الواجب/الاختبار)</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" placeholder="مثال: واجب 1" value={newColTitle} onChange={e => setNewColTitle(e.target.value)}/>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة</label>
                                            <input type="number" className="w-full p-2 border rounded-lg text-sm text-center" value={newColMax} onChange={e => setNewColMax(e.target.value)}/>
                                        </div>
                                        <div className="w-48">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">رابط (اختياري)</label>
                                            <input className="w-full p-2 border rounded-lg text-sm dir-ltr" placeholder="URL..." value={newColUrl} onChange={e => setNewColUrl(e.target.value)}/>
                                        </div>
                                        <div className="w-40">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف (التبويب)</label>
                                            <select 
                                                className="w-full p-2 border rounded-lg text-sm bg-white" 
                                                value={newColCategory} 
                                                onChange={e => setNewColCategory(e.target.value)}
                                            >
                                                {DEFAULT_CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                                <option value="CUSTOM">أخرى / جديد...</option>
                                            </select>
                                        </div>
                                        {newColCategory === 'CUSTOM' && (
                                            <div className="w-32">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">اسم التبويب</label>
                                                <input className="w-full p-2 border rounded-lg text-sm bg-yellow-50" placeholder="مثال: مشاريع" value={newCustomCategory} onChange={e => setNewCustomCategory(e.target.value)}/>
                                            </div>
                                        )}
                                        <button onClick={handleAddColumn} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2">
                                            <Plus size={16}/> إضافة
                                        </button>
                                    </div>

                                    {/* Existing Columns List */}
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="p-3 bg-gray-50 border-b text-xs font-bold text-gray-500 flex">
                                            <div className="flex-1">عنوان العمود</div>
                                            <div className="w-24 text-center">الدرجة</div>
                                            <div className="w-48 text-center">الرابط</div>
                                            <div className="w-32 text-center">التصنيف</div>
                                            <div className="w-20 text-center">حذف</div>
                                        </div>
                                        <div className="divide-y max-h-60 overflow-y-auto">
                                            {settingsAssignments.length > 0 ? settingsAssignments.map(assign => (
                                                <div key={assign.id} className="p-3 flex items-center hover:bg-gray-50">
                                                    <div className="flex-1">
                                                        <input 
                                                            className="w-full bg-transparent outline-none font-bold text-gray-700 text-sm" 
                                                            value={assign.title} 
                                                            onChange={e => handleUpdateColumn({...assign, title: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="w-24 text-center">
                                                        <input 
                                                            className="w-full bg-transparent outline-none text-center text-sm font-mono" 
                                                            value={assign.maxScore} 
                                                            onChange={e => handleUpdateColumn({...assign, maxScore: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                    <div className="w-48 text-center">
                                                        <input 
                                                            className="w-full bg-transparent outline-none text-xs text-blue-600 dir-ltr" 
                                                            value={assign.url || ''} 
                                                            placeholder="أضف رابط..."
                                                            onChange={e => handleUpdateColumn({...assign, url: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="w-32 text-center">
                                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                            {CATEGORY_LABELS[assign.category] || assign.category}
                                                        </span>
                                                    </div>
                                                    <div className="w-20 text-center">
                                                        <button onClick={() => handleDeleteColumn(assign.id)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                            )) : <div className="p-6 text-center text-gray-400 text-sm">لا توجد أعمدة مضافة لهذا الفصل/الفترة.</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- DISTRIBUTION TAB --- */}
                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                            <PieChart size={18}/> توزيع درجات أعمال السنة
                                        </h4>
                                        <p className="text-sm text-orange-700 mb-4">
                                            حدد ثقل (وزن) كل فئة في المجموع النهائي. سيتم تحويل مجموع درجات الطالب في كل فئة إلى هذا الوزن تلقائياً.
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الواجبات</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-2 border rounded font-bold text-center text-lg" 
                                                    value={yearWorkConfig.hw}
                                                    onChange={e => setYearWorkConfig({...yearWorkConfig, hw: Number(e.target.value)})}
                                                />
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الأنشطة / المشاركة</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-2 border rounded font-bold text-center text-lg" 
                                                    value={yearWorkConfig.act}
                                                    onChange={e => setYearWorkConfig({...yearWorkConfig, act: Number(e.target.value)})}
                                                />
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الحضور والغياب</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-2 border rounded font-bold text-center text-lg" 
                                                    value={yearWorkConfig.att}
                                                    onChange={e => setYearWorkConfig({...yearWorkConfig, att: Number(e.target.value)})}
                                                />
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الاختبارات (المنصة)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-2 border rounded font-bold text-center text-lg" 
                                                    value={yearWorkConfig.exam}
                                                    onChange={e => setYearWorkConfig({...yearWorkConfig, exam: Number(e.target.value)})}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between items-center">
                                            <span className="font-bold text-gray-700">المجموع الكلي: {yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam}</span>
                                            <button onClick={saveYearWorkSettings} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700">حفظ التوزيع</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- GOOGLE SHEET TAB --- */}
                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-3">
                                        <label className="block text-sm font-bold text-green-800">رابط ملف Google Sheet (تأكد من صلاحية العرض)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 p-2 border border-green-300 rounded-lg text-sm dir-ltr" 
                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                                value={googleSheetUrl}
                                                onChange={e => setGoogleSheetUrl(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleFetchSheetHeaders} 
                                                disabled={isFetchingStructure || !googleSheetUrl}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isFetchingStructure ? <Loader2 className="animate-spin" size={16}/> : <CloudLightning size={16}/>} جلب الأعمدة
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-green-200">
                                            {/* Target Context */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-green-700">الاستيراد إلى:</span>
                                                <select 
                                                    className="p-1.5 border border-green-300 rounded text-xs bg-white h-8 min-w-[100px]"
                                                    value={settingTermId} 
                                                    onChange={e => { setSettingTermId(e.target.value); setSettingPeriodId(''); }}
                                                >
                                                    <option value="">الفصل...</option>
                                                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <select 
                                                    className="p-1.5 border border-green-300 rounded text-xs bg-white h-8 min-w-[100px]"
                                                    value={settingPeriodId} 
                                                    onChange={e => setSettingPeriodId(e.target.value)}
                                                >
                                                    <option value="">الفترة (عام)</option>
                                                    {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>

                                            {/* Sheet Selector - Only if sheets exist */}
                                            {sheetNames.length > 0 && (
                                                <div className="flex items-center gap-2 border-r border-green-300 pr-4 mr-2">
                                                    <span className="text-xs font-bold text-green-700">من ورقة:</span>
                                                    <select 
                                                        className="p-1.5 border border-green-300 rounded text-xs bg-white h-8"
                                                        value={selectedSheetName} 
                                                        onChange={handleSheetSelectionChange}
                                                    >
                                                        {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {/* NEW: Category Selector for Import */}
                                            <div className="flex items-center gap-2 border-r border-green-300 pr-4 mr-2">
                                                <span className="text-xs font-bold text-green-700 flex items-center gap-1"><Tag size={12}/> تصنيف العمود:</span>
                                                <select 
                                                    className="p-1.5 border border-green-300 rounded text-xs bg-white h-8"
                                                    value={importCategory} 
                                                    onChange={e => setImportCategory(e.target.value)}
                                                >
                                                    {DEFAULT_CATEGORIES.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                    ))}
                                                    <option value="CUSTOM">أخرى / جديد...</option>
                                                </select>
                                                {importCategory === 'CUSTOM' && (
                                                    <input 
                                                        className="p-1.5 border border-green-300 rounded text-xs bg-white h-8 w-24" 
                                                        placeholder="اسم التبويب"
                                                        value={customImportCategory}
                                                        onChange={e => setCustomImportCategory(e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {availableHeaders.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 text-sm">اختر الأعمدة لاستيرادها كـ {importCategory === 'CUSTOM' ? (customImportCategory || 'مخصص') : CATEGORY_LABELS[importCategory]}</div>
                                            
                                            {/* Header Grid */}
                                            <div className="grid grid-cols-12 bg-gray-50 text-xs font-bold text-gray-500 border-b px-4 py-2">
                                                <div className="col-span-4 md:col-span-3">اسم العمود (من الملف)</div>
                                                <div className="col-span-2 md:col-span-2 text-center">الدرجة العظمى</div>
                                                <div className="col-span-4 md:col-span-5 text-center">رابط المصدر (اختياري)</div>
                                                <div className="col-span-2 md:col-span-2 text-center">إجراء</div>
                                            </div>

                                            <div className="p-0 max-h-80 overflow-y-auto divide-y divide-gray-100">
                                                {availableHeaders.map(header => {
                                                    // Calculate max from data if available
                                                    const detectedMax = sheetData.length > 0 
                                                        ? sheetData.reduce((max, row) => {
                                                            const val = parseFloat(row[header]);
                                                            return !isNaN(val) && val > max ? val : max;
                                                        }, 0)
                                                        : 0;
                                                        
                                                    // Local state for this row's max input
                                                    const currentMax = sheetColMaxScores[header] || (detectedMax > 0 ? String(detectedMax) : '10');
                                                    const currentUrl = sheetColUrls[header] || '';

                                                    return (
                                                        <div key={header} className="grid grid-cols-12 items-center p-3 hover:bg-gray-50 transition-colors">
                                                            <div className="col-span-4 md:col-span-3 font-medium text-sm text-gray-700 truncate pr-2" title={header}>
                                                                {header}
                                                            </div>
                                                            
                                                            <div className="col-span-2 md:col-span-2 flex justify-center">
                                                                <div className="relative group">
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-16 p-1 border rounded text-center text-sm font-bold bg-white focus:ring-1 focus:ring-green-500 outline-none"
                                                                        value={currentMax}
                                                                        onChange={(e) => setSheetColMaxScores(prev => ({...prev, [header]: e.target.value}))}
                                                                    />
                                                                    {detectedMax > 0 && (
                                                                        <div 
                                                                            onClick={() => setSheetColMaxScores(prev => ({...prev, [header]: String(detectedMax)}))}
                                                                            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 flex items-center gap-1"
                                                                            title="اضغط لاستخدام أعلى درجة في العمود"
                                                                        >
                                                                            <Maximize size={10}/>
                                                                            أعلى درجة: {detectedMax}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="col-span-4 md:col-span-5 px-2">
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full p-1 border rounded text-xs dir-ltr bg-white focus:ring-1 focus:ring-green-500 outline-none"
                                                                    placeholder="URL..."
                                                                    value={currentUrl}
                                                                    onChange={(e) => setSheetColUrls(prev => ({...prev, [header]: e.target.value}))}
                                                                />
                                                            </div>

                                                            <div className="col-span-2 md:col-span-2 flex justify-center">
                                                                <button 
                                                                    onClick={() => handleImportColumnFromSheet(header, currentMax, currentUrl)}
                                                                    className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 flex items-center gap-1 transition-colors"
                                                                >
                                                                    <ArrowDownToLine size={14}/> استيراد
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;