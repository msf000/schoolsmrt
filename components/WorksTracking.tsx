
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const IGNORED_COLUMNS = ['name', 'id', 'class', 'grade', 'student', 'الاسم', 'الفصل', 'الصف', 'الهوية', 'السجل', 'ملاحظات', 'note', 'nationalid', 'gender', 'mobile', 'phone', 'timestamp', 'email', 'بريد'];

const STUDENT_NAME_HEADERS = [
    'الاسم', 'اسم', 'اسم الطالب', 'الطالب', 'اسمك', 'لطالب', 
    'الاسم الثلاثي', 'الاسم الرباعي', 'الاسم الكامل',
    'name', 'student', 'student name', 'full name', 'student_name'
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK'>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return (saved === 'HOMEWORK' || saved === 'ACTIVITY' || saved === 'PLATFORM_EXAM' || saved === 'YEAR_WORK') ? saved : 'HOMEWORK';
    });

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
    }, [activeTab]);
    
    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedPeriodId, setSelectedPeriodId] = useState(''); 
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClass, setSelectedClass] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
    const [activityTarget, setActivityTarget] = useState(15);

    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 15, att: 15, exam: 20
    });

    // Google Sheet Sync Settings
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [settingTermId, setSettingTermId] = useState('');
    const [settingPeriodId, setSettingPeriodId] = useState('');
    
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [selectedHeaders, setSelectedHeaders] = useState<Set<string>>(new Set());
    const [unmatchedStudents, setUnmatchedStudents] = useState<string[]>([]);
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [syncStep, setSyncStep] = useState<'URL' | 'SELECTION'>('URL');

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

    // ... (Sync Logic Omitted for brevity - same as before)
    const handleQuickSheetSync = useCallback(async (isAuto = false) => {
        const url = getWorksMasterUrl();
        if (!url) {
            if (!isAuto) alert('لا يوجد رابط ملف مسجل. يرجى إعداده من "إعدادات الأعمدة".');
            return;
        }
        
        let termToUse = selectedTermId;
        if (!termToUse && terms.length > 0) {
             const current = terms.find(t => t.isCurrent);
             termToUse = current ? current.id : terms[0].id;
        }
        
        if (!termToUse) {
            if (!isAuto) alert('الرجاء اختيار الفترة الدراسية أولاً.');
            return;
        }
        
        setIsSheetSyncing(true);
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(url);
            if (sheetNames.length === 0) throw new Error('الملف فارغ');
            
            let targetSheet = sheetNames[0]; 
            const tabKeywords: Record<string, string[]> = {
                'HOMEWORK': ['homework', 'wa واجب', 'واجبات', 'منزل', 'home'],
                'ACTIVITY': ['activity', 'participation', 'class', 'نشاط', 'مشاركة', 'أنشطة'],
                'PLATFORM_EXAM': ['exam', 'test', 'quiz', 'اختبار', 'منصة', 'تقييم']
            };

            const keywords = tabKeywords[activeTab] || [];
            const matchedSheet = sheetNames.find(name => 
                keywords.some(k => name.toLowerCase().includes(k))
            );

            if (matchedSheet) {
                targetSheet = matchedSheet;
            }

            const { headers, data } = getSheetHeadersAndData(workbook, targetSheet);
            let newAssignmentsCount = 0;
            let updatedCount = 0;
            const recordsToUpsert: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];
            const currentAssignments = fetchAssignments(activeTab);
            const potentialHeaders = headers.filter(h => !IGNORED_COLUMNS.some(ig => h.toLowerCase().includes(ig)));

            for (const header of potentialHeaders) {
                let title = header;
                let maxScore = 10;
                const match = header.match(/(.+)\s*\((\d+)\)$/);
                if (match) { title = match[1].trim(); maxScore = parseInt(match[2], 10); }

                let targetAssignment = currentAssignments.find(a => a.title === title && a.termId === termToUse);
                
                if (!targetAssignment) {
                    const newId = `gs_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                    targetAssignment = {
                        id: newId,
                        title: title,
                        category: activeTab === 'YEAR_WORK' ? 'HOMEWORK' : activeTab as any,
                        maxScore: maxScore,
                        isVisible: true,
                        teacherId: currentUser?.id,
                        termId: termToUse,
                        periodId: selectedPeriodId || undefined,
                        orderIndex: 100 + currentAssignments.length + newAssignmentsCount,
                        sourceMetadata: JSON.stringify({ sheet: targetSheet, header: header })
                    };
                    await saveAssignment(targetAssignment);
                    newAssignmentsCount++;
                }

                data.forEach(row => {
                    let student: Student | undefined;
                    const rowNid = row['الهوية'] || row['السجل'] || row['id'] || row['nationalId'] || row['ID'];
                    if (rowNid) student = students.find(s => s.nationalId === String(rowNid).trim());
                    if (!student) {
                        const rowName = findStudentNameInRow(row);
                        if (rowName) {
                            const cleanName = String(rowName).trim();
                            student = students.find(s => s.name.trim() === cleanName || cleanName.includes(s.name) || s.name.includes(cleanName));
                        }
                    }

                    if (student) {
                        const rawVal = row[header];
                        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                            const numVal = parseFloat(String(rawVal));
                            if (!isNaN(numVal)) {
                                const existingRecord = performance.find(p => p.studentId === student!.id && p.notes === targetAssignment!.id);
                                if (!existingRecord || existingRecord.score !== numVal) {
                                    recordsToUpsert.push({
                                        id: existingRecord ? existingRecord.id : `${student.id}_${targetAssignment!.id}`,
                                        studentId: student.id,
                                        subject: selectedSubject || 'عام',
                                        title: targetAssignment!.title,
                                        category: targetAssignment!.category,
                                        score: numVal,
                                        maxScore: targetAssignment!.maxScore,
                                        date: existingRecord ? existingRecord.date : today,
                                        notes: targetAssignment!.id,
                                        createdById: currentUser?.id
                                    });
                                    updatedCount++;
                                }
                            }
                        }
                    }
                });
            }

            if (recordsToUpsert.length > 0) {
                await bulkAddPerformance(recordsToUpsert);
            }
            setAssignments(fetchAssignments(activeTab));
            if (!isAuto) {
                if (newAssignmentsCount > 0 || updatedCount > 0) alert(`تم التحديث بنجاح!`);
                else alert(`تم الفحص. لا توجد تغييرات.`);
            }
        } catch (e: any) {
            if (!isAuto) alert('خطأ: ' + e.message);
        } finally {
            setIsSheetSyncing(false);
        }
    }, [activeTab, currentUser, isManager, performance, selectedPeriodId, selectedSubject, selectedTermId, students, terms, fetchAssignments]);

    // ... (Effects for Init, Loading Config, Terms, etc.)
    useEffect(() => {
        const initData = async () => {
            setIsRefreshing(true);
            try {
                await downloadFromSupabase();
                const savedUrl = getWorksMasterUrl();
                if (savedUrl) setTimeout(() => handleQuickSheetSync(true), 1500);
            } catch (e) {
                console.error("Auto refresh failed", e);
            } finally {
                setIsRefreshing(false);
            }
        };
        initData();
    }, []); 

    useEffect(() => {
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setGoogleSheetUrl(savedUrl);

            const savedConfig = localStorage.getItem('works_year_config');
            if (savedConfig) setYearWorkConfig(JSON.parse(savedConfig));

            const current = loadedTerms.find(t => t.isCurrent);
            if (current) {
                setSelectedTermId(current.id);
                setSettingTermId(current.id); 
            } else if (loadedTerms.length > 0) {
                setSelectedTermId(loadedTerms[0].id);
                setSettingTermId(loadedTerms[0].id);
            }
            const subs = getSubjects(currentUser.id);
            if(subs.length > 0) setSelectedSubject(subs[0].name);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(fetchAssignments(activeTab));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId, fetchAssignments]);

    useEffect(() => {
        localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig));
    }, [yearWorkConfig]);

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activePeriods = activeTerm?.periods || [];
    
    const settingsTerm = terms.find(t => t.id === settingTermId);
    const settingsPeriods = settingsTerm?.periods || [];

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
            const periodMatch = !selectedPeriodId || (a.periodId === selectedPeriodId);
            return termMatch && periodMatch;
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

    // Initialize scores
    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        
        filteredStudents.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => 
                p.studentId === s.id && 
                p.subject === selectedSubject &&
                (activeTab === 'YEAR_WORK' || p.category === activeTab)
            );

            studentPerf.forEach(p => {
                if (p.notes && filteredAssignments.some(a => a.id === p.notes)) {
                    newScores[s.id][p.notes] = p.score.toString();
                } else {
                    const assign = filteredAssignments.find(a => a.title === p.title);
                    if (assign) newScores[s.id][assign.id] = p.score.toString();
                }
            });
        });
        setScores(newScores);
    }, [filteredStudents, performance, selectedSubject, filteredAssignments, activeTab]);

    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [assignmentId]: val }
        }));
    };

    const handleSaveScores = () => {
        if (!selectedSubject) return alert('الرجاء اختيار المادة');
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const val = scores[studentId][assignmentId];
                if (val !== undefined && val !== '') {
                    const assignment = assignments.find(a => a.id === assignmentId);
                    if (assignment) {
                        const existingRecord = performance.find(p => 
                            p.studentId === studentId && 
                            p.notes === assignmentId
                        );

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
            });
        });

        bulkAddPerformance(recordsToSave);
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        try {
            await downloadFromSupabase();
        } catch (e) {
            console.error(e);
            alert('فشل تحديث البيانات.');
        } finally {
            setTimeout(() => setIsRefreshing(false), 800);
        }
    };

    // ... (Excel Fetch & Sync Logic - mostly same) ...
    const handleFetchSheetStructure = async () => {
        if (!googleSheetUrl) return alert('يرجى إدخال رابط الملف');
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            if (sheetNames.length === 0) throw new Error('الملف فارغ');
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            const targetSheet = selectedSheetName && sheetNames.includes(selectedSheetName) ? selectedSheetName : sheetNames[0];
            setSelectedSheetName(targetSheet);
            analyzeSheet(workbook, targetSheet);
            setSyncStep('SELECTION');
        } catch (e: any) {
            alert('فشل الاتصال بالملف: ' + e.message);
        } finally {
            setIsFetchingStructure(false);
        }
    };

    const analyzeSheet = (wb: any, sheet: string) => {
        const { headers, data } = getSheetHeadersAndData(wb, sheet);
        const potentialAssignments = headers.filter(h => !IGNORED_COLUMNS.some(ignored => h.toLowerCase().includes(ignored)));
        setAvailableHeaders(potentialAssignments);
        setSelectedHeaders(new Set(potentialAssignments));
        const unmatched: string[] = [];
        data.forEach(row => {
            const rowNid = row['الهوية'] || row['السجل'] || row['id'] || row['nationalId'];
            let found = false;
            if (rowNid && students.some(s => s.nationalId === String(rowNid).trim())) found = true;
            else {
                const rowName = findStudentNameInRow(row);
                if (rowName && students.some(s => s.name.trim() === String(rowName).trim())) found = true;
            }
            if (!found) {
                const name = findStudentNameInRow(row) || 'Unknown';
                unmatched.push(String(name));
            }
        });
        setUnmatchedStudents(unmatched.slice(0, 10));
    };

    const handleConfirmSync = () => {
        if (!workbookRef || !selectedSheetName || !settingTermId) return;
        setIsFetchingStructure(true);
        try {
            const { data } = getSheetHeadersAndData(workbookRef, selectedSheetName);
            let newAssignmentsCount = 0;
            let updatedScoresCount = 0;
            const recordsToUpsert: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];
            const currentAssignments = fetchAssignments(activeTab);
            
            selectedHeaders.forEach((header, index) => {
                let title = header;
                let maxScore = 10;
                const match = header.match(/(.+)\s*\((\d+)\)$/);
                if (match) { title = match[1].trim(); maxScore = parseInt(match[2], 10); }

                let targetAssignment = currentAssignments.find(a => a.title === title && a.termId === settingTermId && a.category === activeTab);

                if (!targetAssignment) {
                    const newId = `gs_${Date.now()}_${index}`;
                    targetAssignment = {
                        id: newId, title: title, category: activeTab as any, maxScore: Number(maxScore), isVisible: true, teacherId: currentUser?.id, termId: settingTermId, periodId: settingPeriodId || undefined, orderIndex: Number(index) + 100, sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header: header })
                    };
                    saveAssignment(targetAssignment);
                    newAssignmentsCount++;
                }

                data.forEach(row => {
                    let student: Student | undefined;
                    const rowNid = row['الهوية'] || row['السجل'] || row['id'] || row['nationalId'];
                    if (rowNid) student = students.find(s => s.nationalId === String(rowNid).trim());
                    if (!student) {
                        const rowName = findStudentNameInRow(row);
                        if (rowName) student = students.find(s => s.name.trim() === String(rowName).trim());
                    }

                    if (student) {
                        const rawVal = row[header];
                        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                            const numVal = parseFloat(String(rawVal));
                            if (!isNaN(numVal)) {
                                const existingRecord = performance.find(p => p.studentId === student!.id && p.notes === targetAssignment!.id);
                                recordsToUpsert.push({
                                    id: existingRecord ? existingRecord.id : `${student.id}_${targetAssignment!.id}`,
                                    studentId: student.id,
                                    subject: selectedSubject || 'عام',
                                    title: targetAssignment!.title,
                                    category: targetAssignment!.category,
                                    score: numVal,
                                    maxScore: targetAssignment!.maxScore,
                                    date: existingRecord ? existingRecord.date : today,
                                    notes: targetAssignment!.id, 
                                    createdById: currentUser?.id
                                });
                                updatedScoresCount++;
                            }
                        }
                    }
                });
            });

            if (recordsToUpsert.length > 0) onAddPerformance(recordsToUpsert);
            setAssignments(fetchAssignments(activeTab));
            alert(`تمت العملية بنجاح!\n- أعمدة جديدة: ${newAssignmentsCount}\n- درجات محدثة: ${updatedScoresCount}`);
            setIsSettingsOpen(false);
            setSyncStep('URL');
        } catch (e: any) {
            alert('حدث خطأ أثناء المعالجة: ' + e.message);
        } finally {
            setIsFetchingStructure(false);
        }
    };

    // ... (Rest of modal/column management logic same) ...
    const toggleHeaderSelection = (header: string) => {
        const newSet = new Set(selectedHeaders);
        if (newSet.has(header)) newSet.delete(header);
        else newSet.add(header);
        setSelectedHeaders(newSet);
    };

    const handleAddManualColumn = () => {
        const title = prompt('عنوان العمود:');
        if (!title) return;
        const max = prompt('الدرجة العظمى:', '10');
        const newAssign: Assignment = {
            id: Date.now().toString(),
            title, category: activeTab as any, maxScore: Number(max) || 10, isVisible: true, teacherId: currentUser?.id, termId: settingTermId || undefined, periodId: settingPeriodId || undefined
        };
        saveAssignment(newAssign);
        setAssignments(fetchAssignments(activeTab));
    };

    const handleUpdateColumn = (assign: Assignment, updates: Partial<Assignment>) => {
        saveAssignment({ ...assign, ...updates });
        setAssignments(fetchAssignments(activeTab));
    };

    const handleDeleteAssignment = (id: string) => {
        if(confirm('حذف العمود؟ سيتم حذف جميع الدرجات المرتبطة به.')) {
            deleteAssignment(id);
            setAssignments(fetchAssignments(activeTab));
        }
    };

    const calculateYearWork = (student: Student) => {
        let startDate: string | undefined;
        let endDate: string | undefined;
        if (selectedPeriodId) {
            const period = activeTerm?.periods?.find(p => p.id === selectedPeriodId);
            if (period) { startDate = period.startDate; endDate = period.endDate; }
        } else if (activeTerm) { startDate = activeTerm.startDate; endDate = activeTerm.endDate; }

        const filterByPeriod = (date: string) => { if (!startDate || !endDate) return true; return date >= startDate && date <= endDate; };
        
        // Strict filtering of Assignments
        const isAssignmentInScope = (a: Assignment) => {
            if (selectedTermId && a.termId && a.termId !== selectedTermId) return false;
            if (selectedPeriodId && a.periodId && a.periodId !== selectedPeriodId) return false;
            if (selectedPeriodId) return a.periodId === selectedPeriodId;
            if (selectedTermId) return a.termId === selectedTermId;
            return true;
        };

        // Filter Performance Records (Scores)
        const isRecordInScope = (p: PerformanceRecord, validIds: Set<string>) => {
            if (p.studentId !== student.id) return false;
            if (selectedSubject && p.subject !== selectedSubject) return false;
            if (p.notes && validIds.has(p.notes)) return true;
            if (!p.notes && filterByPeriod(p.date)) return true;
            return false;
        };

        const allAssignments = getAssignments('ALL', currentUser?.id, isManager);
        const hwCols = allAssignments.filter(a => a.category === 'HOMEWORK' && isAssignmentInScope(a));
        const actCols = allAssignments.filter(a => a.category === 'ACTIVITY' && isAssignmentInScope(a));
        const examCols = allAssignments.filter(a => a.category === 'PLATFORM_EXAM' && isAssignmentInScope(a));

        const validHWIds = new Set(hwCols.map(a => a.id));
        const validActIds = new Set(actCols.map(a => a.id));
        const validExamIds = new Set(examCols.map(a => a.id));

        const hwRecs = performance.filter(p => p.category === 'HOMEWORK' && isRecordInScope(p, validHWIds));
        const actRecs = performance.filter(p => p.category === 'ACTIVITY' && isRecordInScope(p, validActIds));
        const examRecs = performance.filter(p => p.category === 'PLATFORM_EXAM' && isRecordInScope(p, validExamIds));

        // --- HOMEWORK CALCULATIONS ---
        const hwMax = yearWorkConfig.hw;
        let hwGrade = 0;
        let hwCompletion = 0;
        
        if (hwCols.length > 0) {
            // Calculate completion based on number of submitted assignments vs total required columns
            const distinctHWSubmitted = new Set(hwRecs.map(r => r.notes)).size;
            hwCompletion = Math.min(Math.round((distinctHWSubmitted / hwCols.length) * 100), 100);
            
            // Grade derived from Completion %
            hwGrade = (hwCompletion / 100) * hwMax;
        } else if (hwRecs.length > 0) {
             // Fallback
             hwGrade = hwMax; 
             hwCompletion = 100;
        }

        // --- ACTIVITY CALCULATIONS ---
        const actMax = yearWorkConfig.act;
        let actGrade = 0;
        let actCompletion = 0;
        
        if (actCols.length > 0) {
             const distinctActSubmitted = new Set(actRecs.map(r => r.notes)).size;
             actCompletion = Math.min(Math.round((distinctActSubmitted / actCols.length) * 100), 100);
        } else {
             // Fallback if no columns defined (manual entry vs Target)
             let actSumVal = 0; 
             actRecs.forEach(p => actSumVal += p.score);
             actCompletion = activityTarget > 0 ? Math.min(Math.round((actSumVal / activityTarget) * 100), 100) : 0;
        }
        
        // Grade derived from Completion %
        actGrade = (actCompletion / 100) * actMax;

        const attMax = yearWorkConfig.att;
        const termAtt = attendance.filter(a => a.studentId === student.id && filterByPeriod(a.date));
        const present = termAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
        const attGrade = termAtt.length > 0 ? (present / termAtt.length) * attMax : attMax;

        const examMax = yearWorkConfig.exam;
        let examScoreTotal = 0; 
        let examMaxTotal = 0;
        if (examCols.length > 0) {
             examCols.forEach(col => {
                 const rec = examRecs.find(r => r.notes === col.id);
                 examMaxTotal += col.maxScore;
                 if (rec) examScoreTotal += rec.score;
             });
        } else {
             examRecs.forEach(p => { examScoreTotal += p.score; examMaxTotal += p.maxScore || 20; });
        }
        const examGrade = examMaxTotal > 0 ? (examScoreTotal / examMaxTotal) * examMax : 0;

        const total = hwGrade + actGrade + attGrade + examGrade;
        return { hwGrade, actGrade, attGrade, examGrade, total, hwCompletion, actCompletion };
    };

    const handleExport = () => {
        const rows = filteredStudents.map(s => {
            const rowData: any = { 'الاسم': s.name, 'الصف': s.gradeLevel, 'الفصل': s.className };
            if (activeTab === 'YEAR_WORK') {
                const yw = calculateYearWork(s);
                rowData['واجبات'] = yw.hwGrade.toFixed(1); 
                rowData['نسبة الواجبات'] = yw.hwCompletion + '%';
                rowData['أنشطة'] = yw.actGrade.toFixed(1);
                rowData['نسبة الأنشطة'] = yw.actCompletion + '%';
                rowData['حضور'] = yw.attGrade.toFixed(1); 
                rowData['اختبارات'] = yw.examGrade.toFixed(1); 
                rowData['المجموع'] = yw.total.toFixed(1);
            } else {
                filteredAssignments.forEach(a => { rowData[`${a.title} (${a.maxScore})`] = scores[s.id]?.[a.id] || ''; });
                // Add totals for export if Homework/Activity
                if (activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') {
                    let sum = 0;
                    let max = 0;
                    filteredAssignments.forEach(a => {
                        const val = scores[s.id]?.[a.id];
                        if (val && !isNaN(parseFloat(val))) sum += parseFloat(val);
                        max += a.maxScore;
                    });
                    rowData['المجموع'] = `${sum} / ${max}`;
                }
            }
            return rowData;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scores");
        XLSX.writeFile(wb, `Tracking_${activeTab}_${selectedClass || 'All'}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل الرصد والمتابعة</h2>
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
                                    <option value="">الكل</option>
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

                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setActiveTab('HOMEWORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'HOMEWORK' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>الواجبات</button>
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'ACTIVITY' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}>الأنشطة</button>
                        <button onClick={() => setActiveTab('PLATFORM_EXAM')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'PLATFORM_EXAM' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>الاختبارات</button>
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
                        <button 
                            onClick={handleRefreshAll} 
                            disabled={isRefreshing}
                            className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200"
                        >
                            {isRefreshing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>} تحديث الكل
                        </button>
                        <button onClick={() => { setIsSettingsOpen(true); setSettingTermId(selectedTermId || ''); }} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                            <Settings size={16}/> إعدادات {activeTab === 'YEAR_WORK' ? 'توزيع الدرجات' : 'الأعمدة'}
                        </button>
                        {activeTab !== 'YEAR_WORK' && (
                            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200">
                                <FileSpreadsheet size={16}/> استيراد درجات
                            </button>
                        )}
                        <button onClick={handleExport} className="flex items-center gap-1 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 border border-gray-200">
                            <Download size={16}/> تصدير
                        </button>
                        {activeTab !== 'YEAR_WORK' && (
                            <button onClick={handleSaveScores} disabled={isSaving} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md">
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
                                                            {assign.url && <a href={assign.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink size={12}/></a>}
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
                                    if (activeTab === 'YEAR_WORK') {
                                        const yw = calculateYearWork(student);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 border-b">
                                                <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                                <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">{student.name}</td>
                                                {!selectedClass && <td className="p-3 border-l text-gray-500 text-xs">{student.className}</td>}
                                                <td className="p-3 border-l font-bold bg-blue-50/30">{yw.hwGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l text-xs">
                                                    <span className={`px-2 py-1 rounded font-bold ${yw.hwCompletion >= 80 ? 'bg-green-100 text-green-700' : yw.hwCompletion >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {yw.hwCompletion}%
                                                    </span>
                                                </td>
                                                <td className="p-3 border-l font-bold bg-amber-50/30">{yw.actGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l text-xs">
                                                    <span className={`px-2 py-1 rounded font-bold ${yw.actCompletion >= 80 ? 'bg-green-100 text-green-700' : yw.actCompletion >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {yw.actCompletion}%
                                                    </span>
                                                </td>
                                                <td className="p-3 border-l font-bold bg-green-50/30">{yw.attGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l font-bold bg-purple-50/30">{yw.examGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l font-black text-white bg-gray-800">{yw.total.toFixed(1)}</td>
                                            </tr>
                                        );
                                    }

                                    // Completion Rate & Total Score Calculation
                                    let completionRate = 0;
                                    let totalScore = 0;
                                    let totalMax = 0;

                                    if (activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') {
                                        const total = filteredAssignments.length;
                                        let solved = 0;
                                        filteredAssignments.forEach(a => {
                                            const rawVal = scores[student.id]?.[a.id];
                                            if (rawVal !== undefined && rawVal !== '') {
                                                solved++;
                                                if (!isNaN(parseFloat(rawVal))) {
                                                    totalScore += parseFloat(rawVal);
                                                }
                                            }
                                            totalMax += a.maxScore;
                                        });
                                        completionRate = total > 0 ? Math.round((solved / total) * 100) : 100;
                                    }

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                            <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                            <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">{student.name}</td>
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
                                                        className={`w-full h-full p-2 text-center outline-none bg-transparent focus:bg-indigo-50 font-medium ${scores[student.id]?.[assign.id] ? 'text-indigo-700 font-bold' : 'text-gray-400'}`}
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

            {/* Column Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-bounce-in">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> {activeTab === 'YEAR_WORK' ? 'توزيع درجات أعمال السنة' : `إعدادات الأعمدة (${activeTab})`}</h3>
                            <button onClick={() => { setIsSettingsOpen(false); setSyncStep('URL'); }} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Year Work Configuration */}
                            {activeTab === 'YEAR_WORK' ? (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                        <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><Calculator size={16}/> توزيع الدرجات (Weighting)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الواجبات</label>
                                                <input type="number" className="w-full p-2 border rounded" value={yearWorkConfig.hw} onChange={e => setYearWorkConfig({...yearWorkConfig, hw: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الأنشطة</label>
                                                <input type="number" className="w-full p-2 border rounded" value={yearWorkConfig.act} onChange={e => setYearWorkConfig({...yearWorkConfig, act: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الحضور</label>
                                                <input type="number" className="w-full p-2 border rounded" value={yearWorkConfig.att} onChange={e => setYearWorkConfig({...yearWorkConfig, att: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الاختبارات</label>
                                                <input type="number" className="w-full p-2 border rounded" value={yearWorkConfig.exam} onChange={e => setYearWorkConfig({...yearWorkConfig, exam: Number(e.target.value)})} />
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-indigo-200 flex justify-between items-center">
                                            <span className="font-bold text-gray-700">المجموع الكلي: {yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam}</span>
                                            <button onClick={() => { setIsSettingsOpen(false); }} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">حفظ الإعدادات</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Google Sync Section */}
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2"><FileSpreadsheet size={16}/> استيراد من Google Sheets</h4>
                                        
                                        {syncStep === 'URL' ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 mb-1">رابط الملف</label>
                                                    <input 
                                                        className="w-full p-2 border rounded text-xs dir-ltr" 
                                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                                        value={googleSheetUrl}
                                                        onChange={e => setGoogleSheetUrl(e.target.value)}
                                                    />
                                                </div>
                                                <button 
                                                    onClick={handleFetchSheetStructure} 
                                                    disabled={isFetchingStructure}
                                                    className="bg-green-600 text-white w-full py-2 rounded font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                                                >
                                                    {isFetchingStructure ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
                                                    فحص الملف
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-fade-in">
                                                {/* Setup Section */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 mb-1">ورقة العمل</label>
                                                        <select className="w-full p-2 border rounded text-xs" value={selectedSheetName} onChange={e => { setSelectedSheetName(e.target.value); analyzeSheet(workbookRef, e.target.value); }}>
                                                            {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 mb-1">للفصل الدراسي:</label>
                                                        <select className="w-full p-2 border rounded text-xs" value={settingTermId} onChange={e => setSettingTermId(e.target.value)}>
                                                            <option value="">اختر الفصل...</option>
                                                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 mb-1">للفترة (اختياري):</label>
                                                        <select className="w-full p-2 border rounded text-xs" value={settingPeriodId} onChange={e => setSettingPeriodId(e.target.value)}>
                                                            <option value="">عام / كامل الفصل</option>
                                                            {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Unmatched Warning */}
                                                {unmatchedStudents.length > 0 && (
                                                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs">
                                                        <div className="flex items-center gap-2 text-amber-800 font-bold mb-1">
                                                            <AlertTriangle size={14}/> تنبيه: طلاب غير موجودين ({unmatchedStudents.length})
                                                        </div>
                                                        <div className="max-h-20 overflow-y-auto text-amber-700 px-2">
                                                            {unmatchedStudents.join(', ')}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Column Selection */}
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 mb-2">اختر الأعمدة لإضافتها/تحديثها:</label>
                                                    <div className="max-h-40 overflow-y-auto border rounded bg-white p-2 grid grid-cols-2 gap-2">
                                                        {availableHeaders.length > 0 ? availableHeaders.map(h => (
                                                            <label key={h} className="flex items-center gap-2 p-1.5 hover:bg-green-50 rounded cursor-pointer text-xs">
                                                                <div onClick={() => toggleHeaderSelection(h)} className={`w-4 h-4 border rounded flex items-center justify-center ${selectedHeaders.has(h) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
                                                                    {selectedHeaders.has(h) && <Check size={10}/>}
                                                                </div>
                                                                <span className={selectedHeaders.has(h) ? 'font-bold text-green-800' : 'text-gray-600'}>{h}</span>
                                                            </label>
                                                        )) : <p className="col-span-2 text-center text-gray-400">لا توجد أعمدة صالحة</p>}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button onClick={() => setSyncStep('URL')} className="flex-1 py-2 border rounded text-xs font-bold text-gray-600 hover:bg-gray-50">عودة</button>
                                                    <button 
                                                        onClick={handleConfirmSync} 
                                                        disabled={isFetchingStructure || selectedHeaders.size === 0 || !settingTermId}
                                                        className="flex-2 w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isFetchingStructure ? <Loader2 size={16} className="animate-spin"/> : <DownloadCloud size={16}/>}
                                                        مزامنة وتحديث ({selectedHeaders.size})
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Manual Management */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-gray-700">الأعمدة الحالية ({settingsAssignments.length})</h4>
                                            <div className="flex gap-2">
                                                <select className="text-xs border rounded px-1 outline-none" value={settingPeriodId} onChange={e => setSettingPeriodId(e.target.value)}>
                                                    <option value="">فترة: عام</option>
                                                    {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <button onClick={handleAddManualColumn} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded border border-indigo-200 font-bold flex items-center gap-1 hover:bg-indigo-100">
                                                    <Plus size={14}/> إضافة يدوي
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {settingsAssignments.map(col => (
                                                <div key={col.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded border hover:bg-white hover:shadow-sm transition-all">
                                                    <input 
                                                        className="font-bold text-gray-800 bg-transparent outline-none w-1/3 text-sm" 
                                                        value={col.title} 
                                                        onChange={e => handleUpdateColumn(col, { title: e.target.value })}
                                                    />
                                                    <span className="text-xs text-gray-400">Max:</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-12 p-1 border rounded text-center text-xs font-bold" 
                                                        value={col.maxScore} 
                                                        onChange={e => handleUpdateColumn(col, { maxScore: Number(e.target.value) })}
                                                    />
                                                    
                                                    {/* Period Selector in Edit Mode */}
                                                    {settingsPeriods.length > 0 && (
                                                        <select 
                                                            className="text-xs border rounded p-1 max-w-[80px]"
                                                            value={col.periodId || ''}
                                                            onChange={e => handleUpdateColumn(col, { periodId: e.target.value || undefined })}
                                                        >
                                                            <option value="">عام</option>
                                                            {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    )}

                                                    <div className="flex-1 flex items-center gap-1 bg-white border rounded px-2">
                                                        <LinkIcon size={12} className="text-gray-400"/>
                                                        <input 
                                                            className="w-full p-1 text-xs outline-none text-blue-600 dir-ltr" 
                                                            placeholder="رابط إثرائي (اختياري)"
                                                            value={col.url || ''}
                                                            onChange={e => handleUpdateColumn(col, { url: e.target.value })}
                                                        />
                                                    </div>
                                                    <button onClick={() => handleDeleteAssignment(col.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                            {settingsAssignments.length === 0 && <p className="text-center text-gray-400 text-xs py-4">لا توجد أعمدة في هذه الفترة.</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 text-right">
                            <button onClick={() => { setIsSettingsOpen(false); setSyncStep('URL'); }} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-black">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && !isManager && (
                <div className="fixed inset-0 z-[100] bg-white">
                    <DataImport 
                        existingStudents={students}
                        onImportStudents={() => {}}
                        onImportAttendance={() => {}} 
                        onImportPerformance={(records) => {
                            onAddPerformance(records);
                            setIsImportModalOpen(false);
                            alert('تم استيراد الدرجات بنجاح');
                        }}
                        forcedType="PERFORMANCE"
                        onClose={() => setIsImportModalOpen(false)}
                        currentUser={currentUser}
                    />
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
