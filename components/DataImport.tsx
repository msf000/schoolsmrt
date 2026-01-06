
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowLeft, Sheet, ArrowRight, Table, CheckSquare, Square, RefreshCw, PlusCircle, AlertTriangle, Trash2, ArrowRightCircle, X, Database, Globe, MousePointerClick, Clipboard, Download, Sparkles, BrainCircuit } from 'lucide-react';
import { getWorkbookStructure, getSheetHeadersAndData, fetchWorkbookStructureUrl, guessMapping, processMappedData, extractGoogleSheetId, fetchGoogleSheetData } from '../services/excelService';
import { predictColumnMapping } from '../services/geminiService';
import { Student, CustomTable, SystemUser, TeacherAssignment, ScheduleItem } from '../types';
// Fix: Use actual exported members from storageService.ts
import { addCustomTable, getCustomTables, deleteCustomTable, getSchedules } from '../services/storageService';
import * as XLSX from 'xlsx';

interface DataImportProps {
  onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
  onImportPerformance: (records: any[]) => void;
  onImportAttendance?: (records: any[]) => void;
  existingStudents: Student[];
  forcedType?: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'; 
  onClose?: () => void;
  // New prop: If provided, the component acts as a data fetcher and returns raw data to parent instead of saving to DB
  onDataReady?: (data: any[]) => void; 
  currentUser?: SystemUser | null; // Added for schedule enrichment
}

const FIELD_DEFINITIONS = {
    STUDENTS: [
        { key: 'nationalId', label: 'رقم الهوية / السجل (المفتاح الأساسي)', required: true, isUnique: true },
        { key: 'name', label: 'اسم الطالب', required: true },
        { key: 'gradeLevel', label: 'الصف', required: false },
        { key: 'className', label: 'الفصل', required: false },
        { key: 'phone', label: 'جوال الطالب', required: false, isUnique: true },
        { key: 'email', label: 'ايميل الطالب', required: false, isUnique: true },
        { key: 'parentName', label: 'اسم ولي الأمر', required: false },
        { key: 'parentPhone', label: 'جوال ولي الأمر', required: false },
        { key: 'parentEmail', label: 'ايميل ولي الأمر', required: false },
    ],
    PERFORMANCE: [
        { key: 'nationalId', label: 'رقم الهوية (للمطابقة - مفضل)', required: false },
        { key: 'studentName', label: 'اسم الطالب (بديل للمطابقة)', required: false },
        { key: 'subject', label: 'المادة', required: false },
        { key: 'title', label: 'عنوان التقييم', required: false },
        { key: 'score', label: 'الدرجة', required: true },
        { key: 'maxScore', label: 'الدرجة العظمى', required: false },
        { key: 'date', label: 'التاريخ', required: false },
    ],
    ATTENDANCE: [
        { key: 'nationalId', label: 'رقم الهوية (للمطابقة - مفضل)', required: false },
        { key: 'studentName', label: 'اسم الطالب (بديل للمطابقة)', required: false },
        { key: 'status', label: 'الحالة (حاضر/غائب/متأخر)', required: true },
        { key: 'date', label: 'التاريخ (DD/MM/YYYY)', required: false },
        { key: 'subject', label: 'المادة (للحضور المفصل)', required: false },
        { key: 'period', label: 'رقم الحصة (للحضور المفصل)', required: false },
    ]
};

const DataImport: React.FC<DataImportProps> = ({ onImportStudents, onImportPerformance, onImportAttendance, existingStudents, forcedType, onClose, onDataReady, currentUser }) => {
  // Mode State: SYSTEM (Std/Perf/Att) vs CUSTOM (Generic Excel)
  const initialMode = onDataReady ? 'CUSTOM' : (forcedType ? 'SYSTEM' : 'SYSTEM');
  const [importMode, setImportMode] = useState<'SYSTEM' | 'CUSTOM'>(initialMode);
  const [sourceMethod, setSourceMethod] = useState<'FILE' | 'URL'>('FILE');

  // -- Shared State --
  const [step, setStep] = useState<'UPLOAD' | 'SHEET_SELECT' | 'MAPPING' | 'PREVIEW_SELECT'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawSheetData, setRawSheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // -- System Import Specific --
  const [dataType, setDataType] = useState<'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'>(forcedType || 'STUDENTS');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [matchKey, setMatchKey] = useState<keyof Student>('nationalId');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'UPDATE' | 'SKIP' | 'NEW'>('UPDATE');
  const [allowedUpdateFields, setAllowedUpdateFields] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());

  // -- Custom Import Specific --
  const [customTableName, setCustomTableName] = useState('');
  const [selectedCustomColumns, setSelectedCustomColumns] = useState<Set<string>>(new Set());
  const [existingCustomTables, setExistingCustomTables] = useState<CustomTable[]>([]);
  
  // AI Loading State
  const [aiLoading, setAiLoading] = useState(false);

  // Sorting for Preview
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
      if(forcedType) setDataType(forcedType);
  }, [forcedType]);

  useEffect(() => {
      if(importMode === 'CUSTOM' && !onDataReady) {
          setExistingCustomTables(getCustomTables());
      }
  }, [importMode, onDataReady]);

  useEffect(() => {
      const mapped = Object.keys(columnMapping);
      setAllowedUpdateFields(mapped.filter(k => k !== matchKey));
  }, [columnMapping, matchKey]);

  const resetState = () => {
      setStep('UPLOAD');
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet('');
      setFileHeaders([]);
      setRawSheetData([]);
      setColumnMapping({});
      setProcessedData([]);
      setRemovedIndices(new Set());
      setSelectedRowIndices(new Set());
      setStatus(null);
      setSortConfig(null);
      setCustomTableName('');
      setSelectedCustomColumns(new Set());
      setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleDownloadTemplate = () => {
      let headers: any[] = [];
      let filename = 'Template.xlsx';

      if (dataType === 'ATTENDANCE') {
          filename = 'قالب_الحضور_والغياب.xlsx';
          headers = [{ 'رقم الهوية': '1012345678', 'اسم الطالب': 'أحمد محمد', 'الحالة': 'حاضر', 'التاريخ': '25/10/2023', 'المادة': 'رياضيات', 'رقم الحصة': '1' }];
      } else if (dataType === 'PERFORMANCE') {
          filename = 'قالب_الدرجات.xlsx';
          headers = [{ 'رقم الهوية': '1012345678', 'اسم الطالب': 'أحمد محمد', 'المادة': 'رياضيات', 'عنوان التقييم': 'اختبار 1', 'الدرجة': 18, 'الدرجة العظمى': 20 }];
      } else if (dataType === 'STUDENTS') {
          filename = 'قالب_بيانات_الطلاب.xlsx';
          headers = [{ 'رقم الهوية': '10xxxxxxxx', 'اسم الطالب': 'الاسم الثلاثي', 'الصف': 'الصف الأول', 'الفصل': '1/أ', 'جوال الطالب': '05xxxxxxxx' }];
      }

      const ws = XLSX.utils.json_to_sheet(headers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بيانات");
      XLSX.writeFile(wb, filename);
  };

  const handleScan = async () => {
      setLoading(true);
      setStatus(null);
      try {
          if (sourceMethod === 'URL') {
              if (!url) throw new Error('الرجاء إدخال رابط الملف.');
              const googleSheetId = extractGoogleSheetId(url);
              const apiKey = process.env.API_KEY; 

              // 1. Try Google Sheets API if ID detected and Key exists
              if (googleSheetId && apiKey) {
                  try {
                      const { sheetName, headers, data } = await fetchGoogleSheetData(googleSheetId, apiKey);
                      setSheetNames([sheetName]);
                      setSelectedSheet(sheetName);
                      setFileHeaders(headers);
                      setRawSheetData(data);
                      
                      // Auto-advance
                      if (importMode === 'SYSTEM' && !onDataReady) {
                          const guessed = guessMapping(headers, dataType);
                          setColumnMapping(guessed);
                          setStep('MAPPING');
                      } else {
                          setSelectedCustomColumns(new Set(headers));
                          setSelectedRowIndices(new Set(data.map((_: any, i: number) => i)));
                          setStep('PREVIEW_SELECT');
                      }
                      setLoading(false);
                      return;
                  } catch (apiError: any) {
                      console.warn('Google Sheets API failed, falling back to public export', apiError);
                      // Fallback to fetchWorkbookStructureUrl if API fails (e.g. key invalid or permissions)
                  }
              }

              // 2. Fallback to normal URL fetch (Proxy/Direct)
              const structure = await fetchWorkbookStructureUrl(url);
              setWorkbook(structure.workbook);
              setSheetNames(structure.sheetNames);
              if (structure.sheetNames.length > 0) {
                  setSelectedSheet(structure.sheetNames[0]);
                  setStep('SHEET_SELECT'); 
              } else {
                  throw new Error("الملف لا يحتوي على أوراق عمل.");
              }

          } else {
              if (!file) throw new Error('الرجاء اختيار ملف أولاً.');
              const structure = await getWorkbookStructure(file);
              setWorkbook(structure.workbook);
              setSheetNames(structure.sheetNames);
              if (structure.sheetNames.length > 0) {
                  setSelectedSheet(structure.sheetNames[0]);
                  setStep('SHEET_SELECT'); 
              } else {
                  throw new Error("الملف لا يحتوي على أوراق عمل.");
              }
          }
      } catch (error: any) {
          setStatus({ type: 'error', message: error.message });
      } finally {
          setLoading(false);
      }
  };

  const handleSheetConfirm = () => {
      if (!workbook || !selectedSheet) return;
      handleSheetLoad(workbook, selectedSheet);
  };

  const handleSheetLoad = (wb: any, sheetName: string) => {
      setSelectedSheet(sheetName);
      const { headers, data } = getSheetHeadersAndData(wb, sheetName);
      setFileHeaders(headers);
      setRawSheetData(data);
      
      if (importMode === 'SYSTEM' && !onDataReady) {
          const guessed = guessMapping(headers, dataType);
          setColumnMapping(guessed);
          setStep('MAPPING');
      } else {
          setSelectedCustomColumns(new Set(headers));
          setSelectedRowIndices(new Set(data.map((_: any, i: number) => i)));
          setStep('PREVIEW_SELECT');
      }
  };

  const handleSmartMap = async () => {
      if (!fileHeaders.length || rawSheetData.length === 0) return;
      setAiLoading(true);
      try {
          const targetFields = FIELD_DEFINITIONS[dataType];
          const sampleRow = rawSheetData[0];
          const mapping = await predictColumnMapping(fileHeaders, targetFields, [sampleRow]);
          if (Object.keys(mapping).length > 0) {
              setColumnMapping(prev => ({ ...prev, ...mapping }));
              setStatus({ type: 'success', message: 'تمت المطابقة الذكية بنجاح! يرجى المراجعة.' });
          } else {
              setStatus({ type: 'error', message: 'لم يتمكن الذكاء الاصطناعي من العثور على تطابق مؤكد.' });
          }
      } catch (e) {
          setStatus({ type: 'error', message: 'حدث خطأ أثناء المطابقة الذكية.' });
      } finally {
          setAiLoading(false);
      }
  };

  const enrichImportData = (data: any[]): any[] => {
      const allSchedules = currentUser ? getSchedules() : [];
      const getDayName = (dateStr: string) => {
          const date = new Date(dateStr);
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return days[date.getDay()];
      };

      return data.map(row => {
          let enrichedRow = { ...row };
          let matchedStudent = null;

          // 1. Match Student if ID missing
          const cleanRowId = enrichedRow.nationalId ? String(enrichedRow.nationalId).trim() : null;
          if (!cleanRowId && (enrichedRow.studentName || enrichedRow.name)) {
              const nameToSearch = (enrichedRow.studentName || enrichedRow.name).trim();
              if (nameToSearch) {
                  matchedStudent = existingStudents.find((s: Student) => s.name.trim() === nameToSearch) || 
                                   existingStudents.find((s: Student) => s.name.includes(nameToSearch) || nameToSearch.includes(s.name));
                  
                  if (matchedStudent && matchedStudent.nationalId) {
                      enrichedRow.nationalId = matchedStudent.nationalId;
                      enrichedRow._autoMatchedStudent = true;
                  }
              }
          } else if (cleanRowId) {
              matchedStudent = existingStudents.find((s: Student) => s.nationalId === cleanRowId);
          }

          // 2. Match Schedule
          if ((dataType === 'ATTENDANCE' || dataType === 'PERFORMANCE') && currentUser) {
              const rowDate = enrichedRow.date || new Date().toISOString().split('T')[0];
              const dayName = getDayName(rowDate);
              const teacherSchedule = allSchedules.filter((s: ScheduleItem) => s.day === dayName && s.teacherId === currentUser.id);

              if (matchedStudent && matchedStudent.className && teacherSchedule.length > 0) {
                  const classSchedule = teacherSchedule.filter((s: ScheduleItem) => s.classId === matchedStudent?.className);
                  if (classSchedule.length === 1 && (!enrichedRow.subject || !enrichedRow.period)) {
                      if (!enrichedRow.subject) enrichedRow.subject = classSchedule[0].subjectName;
                      if (!enrichedRow.period) enrichedRow.period = classSchedule[0].period;
                      enrichedRow._autoMatchedSchedule = true; 
                  }
              }
          }
          return enrichedRow;
      });
  };

  const handleProcessData = () => {
      const processed = processMappedData(rawSheetData, columnMapping, dataType, existingStudents);
      const enriched = enrichImportData(processed);
      setProcessedData(enriched);
      setSelectedRowIndices(new Set(enriched.map((_, i) => i)));
      setStep('PREVIEW_SELECT');
  };

  const handleFinalImport = () => {
      if (importMode === 'CUSTOM' || onDataReady) {
          const selectedData = rawSheetData.filter((_, i) => selectedRowIndices.has(i)).map((row: any) => {
              const newRow: any = {};
              Array.from(selectedCustomColumns).forEach((col: string) => {
                  newRow[col] = row[col];
              });
              return newRow;
          });

          if (onDataReady) {
              onDataReady(selectedData);
              if (onClose) onClose();
              return;
          }

          if (!customTableName) return alert('يرجى إدخال اسم الجدول');
          const newTable: CustomTable = {
              id: Date.now().toString(),
              name: customTableName,
              createdAt: new Date().toISOString(),
              columns: Array.from(selectedCustomColumns),
              rows: selectedData,
              teacherId: currentUser?.id
          };
          addCustomTable(newTable);
          alert('تم حفظ الجدول بنجاح!');
          if (onClose) onClose();
      } else {
          // SYSTEM IMPORT
          const finalData = processedData.filter((_, i) => selectedRowIndices.has(i) && !removedIndices.has(i));
          
          if (dataType === 'STUDENTS') {
              onImportStudents(finalData, matchKey, duplicateStrategy, allowedUpdateFields);
          } else if (dataType === 'PERFORMANCE') {
              onImportPerformance(finalData);
          } else if (dataType === 'ATTENDANCE' && onImportAttendance) {
              onImportAttendance(finalData);
          }
          
          alert(`تم استيراد ${finalData.length} سجل بنجاح.`);
          if (onClose) onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <FileSpreadsheet className="text-green-600"/> استيراد البيانات من Excel / Google Sheets
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-500"/></button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full p-6">
        
        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
            <div className={`flex items-center ${step === 'UPLOAD' ? 'text-purple-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${step === 'UPLOAD' ? 'border-purple-600 bg-purple-50' : 'border-green-600 bg-green-50'}`}>1</div>
                <span className="mx-2 font-bold text-sm">المصدر</span>
            </div>
            <div className="w-10 h-1 bg-gray-200 mx-2 rounded"></div>
            <div className={`flex items-center ${step === 'SHEET_SELECT' ? 'text-purple-600' : (['MAPPING','PREVIEW_SELECT'].includes(step) ? 'text-green-600' : 'text-gray-400')}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${step === 'SHEET_SELECT' ? 'border-purple-600 bg-purple-50' : (['MAPPING','PREVIEW_SELECT'].includes(step) ? 'border-green-600 bg-green-50' : 'border-gray-300')}`}>2</div>
                <span className="mx-2 font-bold text-sm">الورقة</span>
            </div>
            {importMode === 'SYSTEM' && (
                <>
                    <div className="w-10 h-1 bg-gray-200 mx-2 rounded"></div>
                    <div className={`flex items-center ${step === 'MAPPING' ? 'text-purple-600' : (step === 'PREVIEW_SELECT' ? 'text-green-600' : 'text-gray-400')}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${step === 'MAPPING' ? 'border-purple-600 bg-purple-50' : (step === 'PREVIEW_SELECT' ? 'border-green-600 bg-green-50' : 'border-gray-300')}`}>3</div>
                        <span className="mx-2 font-bold text-sm">المطابقة</span>
                    </div>
                </>
            )}
            <div className="w-10 h-1 bg-gray-200 mx-2 rounded"></div>
            <div className={`flex items-center ${step === 'PREVIEW_SELECT' ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${step === 'PREVIEW_SELECT' ? 'border-purple-600 bg-purple-50' : 'border-gray-300'}`}>4</div>
                <span className="mx-2 font-bold text-sm">مراجعة</span>
            </div>
        </div>

        {/* --- STEP 1: UPLOAD --- */}
        {step === 'UPLOAD' && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 p-10">
                <div className="w-full max-w-md space-y-6">
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button onClick={() => setSourceMethod('FILE')} className={`flex-1 py-2 text-sm font-bold rounded-md ${sourceMethod === 'FILE' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}>ملف محلي</button>
                        <button onClick={() => setSourceMethod('URL')} className={`flex-1 py-2 text-sm font-bold rounded-md ${sourceMethod === 'URL' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}>رابط (Cloud)</button>
                    </div>

                    {sourceMethod === 'FILE' ? (
                        <div className="space-y-4 text-center">
                            <input type="file" id="file-upload" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                            <label htmlFor="file-upload" className="block w-full py-10 bg-white border-2 border-dashed border-purple-200 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                                <Upload size={48} className="mx-auto text-purple-400 mb-2"/>
                                <span className="text-gray-600 font-bold">اضغط هنا لاختيار ملف Excel</span>
                                <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
                            </label>
                            {file && <div className="text-sm font-bold text-green-600 flex items-center justify-center gap-2"><CheckCircle size={16}/> تم اختيار: {file.name}</div>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">رابط الملف (Google Sheet / OneDrive)</label>
                            <input className="w-full p-3 border rounded-xl dir-ltr" placeholder="https://docs.google.com/spreadsheets/d/..." value={url} onChange={e => setUrl(e.target.value)} />
                            <p className="text-xs text-gray-500">
                                <b>ملاحظة:</b> إذا كان الملف Google Sheet، تأكد من أنه "عام" (Anyone with the link) أو استخدم إعدادات API.
                            </p>
                        </div>
                    )}

                    {!onDataReady && (
                        <div className="text-center">
                            <button onClick={handleDownloadTemplate} className="text-blue-600 text-xs font-bold hover:underline flex items-center justify-center gap-1 mx-auto">
                                <Download size={14}/> تحميل قالب {dataType === 'STUDENTS' ? 'الطلاب' : dataType === 'PERFORMANCE' ? 'الدرجات' : 'الحضور'}
                            </button>
                        </div>
                    )}

                    {status && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100">{status.message}</div>}

                    <button onClick={handleScan} disabled={loading || (sourceMethod === 'FILE' && !file) || (sourceMethod === 'URL' && !url)} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin"/> : <ArrowLeft/>} {loading ? 'جاري التحميل...' : 'التالي'}
                    </button>
                </div>
            </div>
        )}

        {/* --- STEP 2: SHEET SELECT --- */}
        {step === 'SHEET_SELECT' && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">اختر ورقة العمل (Sheet)</h3>
                <div className="w-full space-y-2 max-h-60 overflow-y-auto border rounded-xl p-2 bg-gray-50">
                    {sheetNames.map(sheet => (
                        <button key={sheet} onClick={() => setSelectedSheet(sheet)} className={`w-full text-right p-3 rounded-lg font-bold text-sm flex items-center gap-3 transition-colors ${selectedSheet === sheet ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-white hover:bg-gray-100 border border-transparent'}`}>
                            <Sheet size={18}/> {sheet}
                        </button>
                    ))}
                </div>
                <div className="flex gap-4 w-full mt-6">
                    <button onClick={resetState} className="flex-1 border py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50">إلغاء</button>
                    <button onClick={handleSheetConfirm} disabled={!selectedSheet} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50">التالي</button>
                </div>
            </div>
        )}

        {/* --- STEP 3: MAPPING (System Mode) --- */}
        {step === 'MAPPING' && importMode === 'SYSTEM' && (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100 flex items-center gap-2">
                        <BrainCircuit size={18}/> المطابقة الذكية مفعلة
                    </div>
                    <button onClick={handleSmartMap} disabled={aiLoading} className="text-purple-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        {aiLoading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} إعادة المطابقة بالذكاء الاصطناعي
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-xl bg-gray-50 p-4 space-y-4">
                    {FIELD_DEFINITIONS[dataType].map(field => (
                        <div key={field.key} className="bg-white p-4 rounded-xl border shadow-sm">
                            <div className="flex justify-between mb-2">
                                <label className="font-bold text-gray-700 flex items-center gap-2">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {columnMapping[field.key] && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">تم الربط</span>}
                            </div>
                            <select 
                                className={`w-full p-2 border rounded-lg text-sm font-bold outline-none focus:ring-2 ${columnMapping[field.key] ? 'border-green-500 bg-green-50' : 'bg-gray-50 focus:ring-purple-500'}`}
                                value={columnMapping[field.key] || ''}
                                onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                            >
                                <option value="">-- اختر العمود من الملف --</option>
                                {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                {status && <div className={`mt-4 p-3 rounded-lg text-sm font-bold ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{status.message}</div>}

                <div className="flex gap-4 mt-6">
                    <button onClick={() => setStep('UPLOAD')} className="px-6 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">رجوع</button>
                    <button onClick={handleProcessData} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg">معاينة البيانات</button>
                </div>
            </div>
        )}

        {/* --- STEP 4: PREVIEW & SELECT --- */}
        {step === 'PREVIEW_SELECT' && (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-xl border">
                    <div className="text-sm font-bold text-gray-600 px-2">
                        تم العثور على {importMode === 'SYSTEM' ? processedData.length : rawSheetData.length} سجل
                    </div>
                    {importMode === 'CUSTOM' && !onDataReady && (
                        <div className="flex gap-2 items-center">
                            <input className="p-2 border rounded-lg text-sm" placeholder="اسم الجدول الجديد" value={customTableName} onChange={e => setCustomTableName(e.target.value)} />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto border rounded-xl bg-white shadow-inner relative">
                    <table className="w-full text-right text-sm border-collapse">
                        <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 w-10 text-center bg-gray-100 border-b">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedRowIndices.size === (importMode === 'SYSTEM' ? processedData.length : rawSheetData.length)} 
                                        onChange={(e) => {
                                            const total = importMode === 'SYSTEM' ? processedData.length : rawSheetData.length;
                                            if (e.target.checked) setSelectedRowIndices(new Set(Array.from({length: total}, (_, i) => i)));
                                            else setSelectedRowIndices(new Set());
                                        }}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                </th>
                                {importMode === 'SYSTEM' ? (
                                    // System Columns
                                    FIELD_DEFINITIONS[dataType].map(f => (
                                        <th key={f.key} className="p-3 border-b whitespace-nowrap font-bold">{f.label.split('(')[0]}</th>
                                    ))
                                ) : (
                                    // Custom Columns (Selectable)
                                    fileHeaders.map(h => (
                                        <th key={h} className={`p-3 border-b whitespace-nowrap cursor-pointer transition-colors ${selectedCustomColumns.has(h) ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-200'}`} onClick={() => {
                                            const newSet = new Set(selectedCustomColumns);
                                            if (newSet.has(h)) newSet.delete(h); else newSet.add(h);
                                            setSelectedCustomColumns(newSet);
                                        }}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedCustomColumns.has(h) ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-400'}`}>
                                                    {selectedCustomColumns.has(h) && <CheckSquare size={12} className="text-white"/>}
                                                </div>
                                                {h}
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(importMode === 'SYSTEM' ? processedData : rawSheetData).map((row, i) => (
                                <tr key={i} className={`hover:bg-blue-50 transition-colors ${!selectedRowIndices.has(i) ? 'opacity-50 bg-gray-50' : ''}`}>
                                    <td className="p-3 text-center border-l bg-gray-50">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedRowIndices.has(i)} 
                                            onChange={(e) => {
                                                const newSet = new Set(selectedRowIndices);
                                                if (e.target.checked) newSet.add(i); else newSet.delete(i);
                                                setSelectedRowIndices(newSet);
                                            }}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </td>
                                    {importMode === 'SYSTEM' ? (
                                        FIELD_DEFINITIONS[dataType].map(f => (
                                            <td key={f.key} className="p-3 border-l text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                                {row[f.key]}
                                                {row._autoMatchedStudent && f.key === 'nationalId' && <span className="mr-1 text-[10px] text-blue-600 font-bold">(ID تلقائي)</span>}
                                                {row._autoMatchedSchedule && (f.key === 'subject' || f.key === 'period') && <span className="mr-1 text-[10px] text-green-600 font-bold">(جدول)</span>}
                                            </td>
                                        ))
                                    ) : (
                                        fileHeaders.map(h => (
                                            <td key={h} className={`p-3 border-l text-gray-700 whitespace-nowrap max-w-[200px] truncate ${!selectedCustomColumns.has(h) ? 'text-gray-300' : ''}`}>
                                                {row[h]}
                                            </td>
                                        ))
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex gap-4 mt-6 pt-4 border-t">
                    <button onClick={() => setStep(importMode === 'SYSTEM' ? 'MAPPING' : 'SHEET_SELECT')} className="px-6 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">تعديل</button>
                    <button onClick={handleFinalImport} disabled={selectedRowIndices.size === 0 || (importMode === 'CUSTOM' && !onDataReady && !customTableName)} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
                        <CheckCircle size={18}/> إتمام الاستيراد ({selectedRowIndices.size})
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default DataImport;
