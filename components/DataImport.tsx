
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowLeft, Sheet, ArrowRight, Table, CheckSquare, Square, RefreshCw, PlusCircle, AlertTriangle, Trash2, ArrowRightCircle, X, Database, Globe, MousePointerClick, Clipboard, Download, Sparkles, BrainCircuit } from 'lucide-react';
import { getWorkbookStructure, getSheetHeadersAndData, fetchWorkbookStructureUrl, guessMapping, processMappedData } from '../services/excelService';
import { predictColumnMapping } from '../services/geminiService';
import { Student, CustomTable } from '../types';
import { addCustomTable, getCustomTables, deleteCustomTable } from '../services/storageService';
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
    ]
};

const DataImport: React.FC<DataImportProps> = ({ onImportStudents, onImportPerformance, onImportAttendance, existingStudents, forcedType, onClose, onDataReady }) => {
  // Mode State: SYSTEM (Std/Perf/Att) vs CUSTOM (Generic Excel)
  // If onDataReady is present, we force 'CUSTOM' mode behavior (selection wise) but with different outcome
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
      // Keep URL if method is URL
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handlePasteUrl = async () => {
      try {
          const text = await navigator.clipboard.readText();
          if (text) setUrl(text);
      } catch (err) {
          console.error('Failed to read clipboard', err);
          setStatus({ type: 'error', message: 'تعذر اللصق التلقائي. يرجى اللصق يدوياً (Ctrl+V).' });
      }
  };

  // --- Template Downloader ---
  const handleDownloadTemplate = () => {
      let headers: any[] = [];
      let filename = 'Template.xlsx';

      if (dataType === 'ATTENDANCE') {
          filename = 'قالب_الحضور_والغياب.xlsx';
          // Sample data row
          headers = [{
              'رقم الهوية': '1012345678',
              'اسم الطالب': 'أحمد محمد',
              'الحالة': 'حاضر',
              'التاريخ': '25/10/2023'
          }, {
              'رقم الهوية': '1087654321',
              'اسم الطالب': 'سعيد علي',
              'الحالة': 'غائب',
              'التاريخ': '25/10/2023'
          }];
      } else if (dataType === 'PERFORMANCE') {
          filename = 'قالب_الدرجات.xlsx';
          headers = [{
              'رقم الهوية': '1012345678',
              'اسم الطالب': 'أحمد محمد',
              'المادة': 'رياضيات',
              'عنوان التقييم': 'اختبار 1',
              'الدرجة': 18,
              'الدرجة العظمى': 20
          }];
      } else if (dataType === 'STUDENTS') {
          filename = 'قالب_بيانات_الطلاب.xlsx';
          headers = [{
              'رقم الهوية': '10xxxxxxxx',
              'اسم الطالب': 'الاسم الثلاثي',
              'الصف': 'الصف الأول',
              'الفصل': '1/أ',
              'جوال الطالب': '05xxxxxxxx'
          }];
      }

      const ws = XLSX.utils.json_to_sheet(headers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بيانات");
      XLSX.writeFile(wb, filename);
  };

  const getUrlType = (link: string) => {
    if (!link) return null;
    if (link.includes('docs.google.com') || link.includes('drive.google.com')) return 'GOOGLE';
    if (link.includes('onedrive.live.com') || link.includes('1drv.ms') || link.includes('sharepoint.com')) return 'ONEDRIVE';
    if (link.includes('dropbox.com')) return 'DROPBOX';
    return 'UNKNOWN';
  };

  const urlType = getUrlType(url);

  const handleScan = async () => {
      setLoading(true);
      setStatus(null);
      try {
          let structure;
          if (sourceMethod === 'FILE') {
              if (!file) throw new Error('الرجاء اختيار ملف أولاً.');
              structure = await getWorkbookStructure(file);
          } else {
              if (!url) throw new Error('الرجاء إدخال رابط الملف.');
              structure = await fetchWorkbookStructureUrl(url);
          }
          
          setWorkbook(structure.workbook);
          setSheetNames(structure.sheetNames);
          
          if (structure.sheetNames.length > 0) {
              setSelectedSheet(structure.sheetNames[0]);
              // Don't auto select, let user choose in SHEET_SELECT
              setStep('SHEET_SELECT'); 
          } else {
              throw new Error("الملف لا يحتوي على أوراق عمل.");
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
          // Default heuristic guess first
          const guessed = guessMapping(headers, dataType);
          setColumnMapping(guessed);
          setStep('MAPPING');
      } else {
          // For Custom OR Generic Data Ready: Skip Mapping, Select ALL columns and rows by default, go to Preview
          setSelectedCustomColumns(new Set(headers));
          setSelectedRowIndices(new Set(data.map((_, i) => i)));
          setStep('PREVIEW_SELECT');
      }
  };

  // --- AI Mapping Function ---
  const handleSmartMap = async () => {
      if (!fileHeaders.length || rawSheetData.length === 0) return;
      
      setAiLoading(true);
      try {
          const targetFields = FIELD_DEFINITIONS[dataType];
          const sampleRow = rawSheetData[0]; // First row for context
          
          const mapping = await predictColumnMapping(fileHeaders, targetFields, [sampleRow]);
          
          if (Object.keys(mapping).length > 0) {
              setColumnMapping(prev => ({ ...prev, ...mapping }));
              setStatus({ type: 'success', message: 'تمت المطابقة الذكية بنجاح! يرجى المراجعة.' });
          } else {
              setStatus({ type: 'error', message: 'لم يتمكن الذكاء الاصطناعي من العثور على تطابق مؤكد.' });
          }
      } catch (e) {
          console.error(e);
          setStatus({ type: 'error', message: 'حدث خطأ أثناء المطابقة الذكية.' });
      } finally {
          setAiLoading(false);
      }
  };

  // --- System Mode Logic ---
  const handleMappingChange = (fieldKey: string, header: string) => {
      setColumnMapping(prev => ({ ...prev, [fieldKey]: header }));
  };

  const handleProceedToPreviewSystem = () => {
      const requiredFields = FIELD_DEFINITIONS[dataType].filter(f => f.required);
      const missing = requiredFields.filter(f => !columnMapping[f.key]);
      
      if (missing.length > 0) {
          setStatus({ type: 'error', message: `يرجى تحديد الأعمدة للحقول الإجبارية: ${missing.map(f => f.label).join(', ')}` });
          return;
      }
      if (dataType === 'PERFORMANCE' || dataType === 'ATTENDANCE') {
          if (!columnMapping['nationalId'] && !columnMapping['studentName']) {
              setStatus({ type: 'error', message: 'يرجى تحديد عمود "رقم الهوية" أو "اسم الطالب" على الأقل لربط البيانات.' });
              return;
          }
      }

      setLoading(true);
      setTimeout(() => {
          const processed = processMappedData(rawSheetData, columnMapping, dataType, existingStudents);
          setProcessedData(processed);
          setSelectedRowIndices(new Set(processed.map((_, i) => i)));
          setRemovedIndices(new Set());
          setStep('PREVIEW_SELECT');
          setLoading(false);
      }, 500);
  };

  // --- Custom Mode Logic ---
  const toggleCustomColumn = (header: string) => {
      const newSet = new Set(selectedCustomColumns);
      if(newSet.has(header)) newSet.delete(header);
      else newSet.add(header);
      setSelectedCustomColumns(newSet);
  }

  // Handle Custom Save / Generic Data Return
  const handleSaveCustomTable = () => {
      if (selectedCustomColumns.size === 0) {
          setStatus({ type: 'error', message: 'يرجى اختيار عمود واحد على الأقل.' });
          return;
      }
      if (selectedRowIndices.size === 0) {
        setStatus({ type: 'error', message: 'يرجى اختيار صف واحد على الأقل.' });
        return;
      }

      const columns = Array.from(selectedCustomColumns) as string[];
      
      // Filter rows based on selected indices
      const rows = rawSheetData
        .filter((_, index) => selectedRowIndices.has(index))
        .map(row => {
            const newRow: any = {};
            columns.forEach((col: string) => newRow[col] = row[col]);
            return newRow;
        });

      // === NEW: If onDataReady provided, return data and exit ===
      if (onDataReady) {
          onDataReady(rows);
          if (onClose) onClose();
          return;
      }

      if (!customTableName) {
          setStatus({ type: 'error', message: 'يرجى تسمية الجدول.' });
          return;
      }

      const newTable: CustomTable = {
          id: Date.now().toString(),
          name: customTableName,
          createdAt: new Date().toISOString().split('T')[0],
          columns,
          rows,
          sourceUrl: sourceMethod === 'URL' ? url : undefined,
          lastUpdated: new Date().toISOString()
      };

      addCustomTable(newTable);
      setStatus({ type: 'success', message: 'تم حفظ الجدول الخاص بنجاح!' });
      setExistingCustomTables(getCustomTables());
      setTimeout(resetState, 2000);
  }

  // --- Selection & Removal Handlers ---
  const toggleRowSelection = (originalIndex: number) => {
      const newSet = new Set(selectedRowIndices);
      if (newSet.has(originalIndex)) newSet.delete(originalIndex);
      else newSet.add(originalIndex);
      setSelectedRowIndices(newSet);
  };

  const toggleSelectAll = () => {
      // Logic differs slightly based on mode
      const totalCount = importMode === 'SYSTEM' && !onDataReady ? analyzedData.length : rawSheetData.length;
      const allSelected = selectedRowIndices.size === totalCount;
      
      if (allSelected) {
          setSelectedRowIndices(new Set());
      } else {
          const newSet = new Set<number>();
          // For System: use _originalIndex, For Custom: use index (0 to length)
          if (importMode === 'SYSTEM' && !onDataReady) {
              analyzedData.forEach(d => newSet.add(d._originalIndex));
          } else {
              for(let i=0; i<totalCount; i++) newSet.add(i);
          }
          setSelectedRowIndices(newSet);
      }
  };

  const handleRemoveSelected = () => {
      if (selectedRowIndices.size === 0) return;
      if (window.confirm("هل أنت متأكد من استبعاد السجلات المحددة من الاستيراد؟")) {
          const newRemoved = new Set(removedIndices);
          selectedRowIndices.forEach(idx => newRemoved.add(idx));
          setRemovedIndices(newRemoved);
          setSelectedRowIndices(new Set());
      }
  };

  // --- System Analysis (Memoized) ---
  const analyzedData = useMemo(() => {
      if (importMode === 'CUSTOM' || onDataReady) return []; // Process differently for Custom
      
      let data = processedData.map((row, index) => {
          let _status: 'NEW' | 'UPDATE' | 'SKIP' = 'NEW';
          let _existingMatch: any = null;
          let _simulatedResult: any = { ...row };

          if (dataType === 'STUDENTS') {
              const rowNid = row.nationalId ? String(row.nationalId).trim() : null;
              if (rowNid) {
                  _existingMatch = existingStudents.find(s => s.nationalId === rowNid);
              }

              if (_existingMatch) {
                  if (duplicateStrategy === 'UPDATE') {
                      _status = 'UPDATE';
                      _simulatedResult = { ..._existingMatch };
                      allowedUpdateFields.forEach(field => {
                          const incomingVal = row[field];
                          if (incomingVal !== undefined && incomingVal !== null && String(incomingVal).trim() !== '') {
                              _simulatedResult[field] = incomingVal;
                          }
                      });
                  } else if (duplicateStrategy === 'SKIP') {
                       _status = 'SKIP';
                       _simulatedResult = _existingMatch;
                  } else {
                       _status = 'NEW'; 
                  }
              }
          }

          return {
              ...row,
              _originalIndex: index,
              _status,
              _existingMatch,
              _simulatedResult
          };
      });

      data = data.filter(r => !removedIndices.has(r._originalIndex));

      if (sortConfig) {
          data.sort((a, b) => {
              const aVal = a._simulatedResult[sortConfig.key] || '';
              const bVal = b._simulatedResult[sortConfig.key] || '';
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return data;
  }, [processedData, existingStudents, matchKey, duplicateStrategy, dataType, sortConfig, removedIndices, allowedUpdateFields, importMode, onDataReady]);


  // --- Render Helpers ---

  const renderComparisonCell = (key: string, row: any) => {
    const finalVal = row._simulatedResult[key];
    const existingVal = row._existingMatch ? row._existingMatch[key] : undefined;
    
    if (!row._existingMatch) return <span className="font-bold text-gray-800">{finalVal || '-'}</span>;

    const hasChanged = String(finalVal || '').trim() !== String(existingVal || '').trim();
    const wasEmpty = !existingVal || String(existingVal).trim() === '';

    if (hasChanged) {
        return (
            <div className="flex flex-col relative group">
                <span className="font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 w-fit">{finalVal}</span>
                {!wasEmpty && <span className="text-[10px] text-gray-400 line-through mt-0.5">{existingVal}</span>}
            </div>
        );
    }
    return <span className="text-gray-400 text-sm">{finalVal || '-'}</span>;
  };

  // --- Handlers for System Final Save ---
  const handleFinalImportSystem = () => {
      setLoading(true);
      try {
          const finalData = analyzedData
              .filter((item) => selectedRowIndices.has(item._originalIndex))
              .map(({ _status, _existingMatch, _originalIndex, _simulatedResult, ...rest }) => rest);
          
          if (finalData.length === 0) throw new Error("لم يتم اختيار أي سجلات للاستيراد.");

          if (dataType === 'STUDENTS') {
              onImportStudents(finalData, matchKey, duplicateStrategy, allowedUpdateFields);
          } else if (dataType === 'ATTENDANCE' && onImportAttendance) {
              onImportAttendance(finalData);
          } else if (dataType === 'PERFORMANCE') {
              onImportPerformance(finalData);
          }

          setStatus({ type: 'success', message: `تم استيراد ${finalData.length} سجل بنجاح!` });
          setTimeout(() => {
              if (onClose) onClose();
          }, 1500);
      } catch (error: any) {
          setStatus({ type: 'error', message: error.message });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="bg-gray-100 min-h-full h-full flex flex-col animate-fade-in relative">
        
        {/* Top Navigation Bar */}
        <div className="bg-white border-b shadow-sm z-20">
            <div className="px-6 py-4 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                            <ArrowLeft size={20}/>
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileSpreadsheet className={importMode === 'SYSTEM' && !onDataReady ? "text-green-600" : "text-purple-600"} />
                            {onDataReady ? 'استيراد بيانات للمطابقة' : (importMode === 'SYSTEM' ? 'استيراد بيانات النظام' : 'استيراد جداول خاصة')}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            {step === 'UPLOAD' && '1. المصدر واختيار الملف'}
                            {step === 'SHEET_SELECT' && '2. اختيار ورقة العمل'}
                            {step === 'MAPPING' && '3. تحديد الأعمدة'}
                            {step === 'PREVIEW_SELECT' && (importMode === 'SYSTEM' && !onDataReady ? '4. المراجعة والحفظ' : '3. تحديد الصفوف والأعمدة')}
                        </p>
                    </div>
                </div>

                {!onDataReady && (
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => { setImportMode('SYSTEM'); resetState(); }} 
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'SYSTEM' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            بيانات الطلاب
                        </button>
                        <button 
                            onClick={() => { setImportMode('CUSTOM'); resetState(); }} 
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'CUSTOM' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            استيراد خاص
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {step === 'MAPPING' && importMode === 'SYSTEM' && !onDataReady && (
                        <button 
                            onClick={handleProceedToPreviewSystem} 
                            disabled={loading} 
                            className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md hover:bg-teal-800 transition-colors"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <Table size={18}/>}
                            <span>معاينة الجدول</span>
                        </button>
                    )}
                    {step === 'PREVIEW_SELECT' && (
                        <button 
                            onClick={importMode === 'SYSTEM' && !onDataReady ? handleFinalImportSystem : handleSaveCustomTable} 
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold"
                        >
                            {onDataReady ? <ArrowRightCircle size={18}/> : <CheckCircle size={18}/>}
                            <span>
                                {onDataReady ? `استخدام البيانات (${selectedRowIndices.size})` : 
                                 (importMode === 'SYSTEM' ? `حفظ البيانات (${selectedRowIndices.size})` : 'حفظ الجدول الخاص')}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6 relative">
            
            {/* Step 1: Upload */}
            {step === 'UPLOAD' && (
                <div className="max-w-4xl mx-auto mt-10 space-y-8">
                     
                     <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                        {/* Type Selection for System Mode */}
                        {importMode === 'SYSTEM' && !forcedType && !onDataReady && (
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 mb-3">نوع البيانات المراد استيرادها</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <button onClick={() => setDataType('STUDENTS')} className={`p-4 border rounded-xl text-center transition-all ${dataType === 'STUDENTS' ? 'border-primary bg-primary/5 text-primary font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>الطلاب</button>
                                    <button onClick={() => setDataType('PERFORMANCE')} className={`p-4 border rounded-xl text-center transition-all ${dataType === 'PERFORMANCE' ? 'border-primary bg-primary/5 text-primary font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>الدرجات</button>
                                    <button onClick={() => setDataType('ATTENDANCE')} className={`p-4 border rounded-xl text-center transition-all ${dataType === 'ATTENDANCE' ? 'border-primary bg-primary/5 text-primary font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>الحضور</button>
                                </div>
                            </div>
                        )}

                        {/* Info Boxes */}
                        {importMode === 'CUSTOM' && !onDataReady && (
                            <div className="mb-6 bg-purple-50 text-purple-800 p-4 rounded-lg border border-purple-200">
                                <h4 className="font-bold flex items-center gap-2 mb-1"><Database size={18}/> استيراد جداول خاصة</h4>
                                <p className="text-sm">يمكنك هنا رفع أي ملف Excel واختيار صفوف وأعمدة محددة منه لحفظها كجدول مستقل.</p>
                            </div>
                        )}
                        {onDataReady && (
                             <div className="mb-6 bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold flex items-center gap-2 mb-1"><Table size={18}/> استيراد بيانات وتوزيعها</h4>
                                <p className="text-sm">سيتم جلب البيانات ومحاولة مطابقة أسماء الأعمدة في الملف مع الأعمدة الموجودة في النظام.</p>
                            </div>
                        )}

                        {/* Source Selection Toggle */}
                        <div className="flex gap-4 mb-4 border-b pb-4">
                            <button onClick={() => setSourceMethod('FILE')} className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 font-bold transition-all ${sourceMethod === 'FILE' ? 'border-gray-800 bg-gray-50 text-gray-800' : 'border-transparent text-gray-400'}`}>
                                <Upload size={18}/> رفع ملف
                            </button>
                            <button onClick={() => setSourceMethod('URL')} className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 font-bold transition-all ${sourceMethod === 'URL' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-transparent text-gray-400'}`}>
                                <Globe size={18}/> رابط مباشر
                            </button>
                        </div>

                        {sourceMethod === 'FILE' ? (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group mb-2">
                                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                                            <Upload size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-700">{file ? file.name : 'اسحب الملف هنا أو اضغط للاختيار'}</h3>
                                            <p className="text-sm text-gray-400 mt-1">يدعم ملفات Excel (.xlsx) و CSV</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {importMode === 'SYSTEM' && !onDataReady && (
                                    <div className="text-center">
                                        <button onClick={handleDownloadTemplate} className="text-sm text-green-600 hover:text-green-800 hover:underline flex items-center justify-center gap-1 mx-auto font-bold">
                                            <Download size={14}/> تحميل قالب Excel جاهز لبيانات {dataType === 'ATTENDANCE' ? 'الحضور' : dataType === 'STUDENTS' ? 'الطلاب' : 'الدرجات'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                             <div className="mb-6 space-y-3">
                                <label className="block text-sm font-bold text-gray-700">رابط الملف (مباشر)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="url" 
                                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                                            className="w-full p-3 border rounded-lg dir-ltr text-left pl-10"
                                            value={url}
                                            onChange={e => setUrl(e.target.value)}
                                        />
                                        <button 
                                            onClick={handlePasteUrl}
                                            className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                                            title="لصق الرابط"
                                        >
                                            <Clipboard size={16}/>
                                        </button>
                                    </div>
                                    <div className="bg-blue-50 text-blue-600 p-3 rounded-lg border border-blue-100 flex items-center">
                                        <Globe size={20}/>
                                    </div>
                                </div>
                                
                                {urlType === 'GOOGLE' && <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> رابط Google Sheets صالح</span>}
                                {urlType === 'ONEDRIVE' && <span className="text-blue-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> رابط OneDrive/SharePoint صالح</span>}

                                <p className="text-xs text-gray-400 leading-relaxed">
                                    يدعم النظام تحويل الروابط تلقائياً من: <br/>
                                    - <b className="text-gray-600">Google Sheets</b> (تأكد أن الرابط متاح للعرض "Anyone with link"). <br/>
                                    - <b className="text-gray-600">OneDrive / SharePoint</b> (انسخ الرابط وقم بلصقه هنا). <br/>
                                    - <b className="text-gray-600">Dropbox</b>.
                                </p>
                            </div>
                        )}

                        <button onClick={handleScan} disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors disabled:opacity-50">
                            {loading ? 'جاري قراءة البيانات...' : 'متابعة'}
                        </button>
                    </div>

                    {status && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">{status.message}</div>}
                </div>
            )}

            {/* Step 2: Sheet Selection (NEW STEP) */}
            {step === 'SHEET_SELECT' && (
                <div className="max-w-2xl mx-auto mt-10 animate-fade-in">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                         <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600"/>
                            اختر ورقة العمل (Sheet)
                         </h3>
                         <p className="text-sm text-gray-500 mb-4">يحتوي الملف على {sheetNames.length} أوراق عمل. يرجى اختيار الورقة التي تحتوي على البيانات.</p>
                         
                         <div className="space-y-3 max-h-60 overflow-y-auto mb-8 pr-1 custom-scrollbar">
                            {sheetNames.map(sheet => (
                                <label key={sheet} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${selectedSheet === sheet ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input 
                                        type="radio" 
                                        name="sheet" 
                                        value={sheet} 
                                        checked={selectedSheet === sheet} 
                                        onChange={() => setSelectedSheet(sheet)}
                                        className="w-5 h-5 text-primary focus:ring-primary accent-primary"
                                    />
                                    <span className="font-bold text-gray-700">{sheet}</span>
                                </label>
                            ))}
                         </div>
                         
                         <div className="flex gap-4">
                             <button onClick={() => setStep('UPLOAD')} className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50">
                                عودة
                             </button>
                             <button onClick={handleSheetConfirm} className="flex-2 w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-teal-800 shadow-md flex items-center justify-center gap-2">
                                متابعة <ArrowLeft size={18}/>
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* Step 3: Mapping (System Mode ONLY) */}
            {step === 'MAPPING' && importMode === 'SYSTEM' && !onDataReady && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border">
                             <Sheet size={16} className="text-gray-500"/>
                             <span className="text-sm text-gray-600 font-bold">ورقة العمل الحالية:</span>
                             <select 
                                value={selectedSheet} 
                                onChange={(e) => handleSheetLoad(workbook, e.target.value)} 
                                className="bg-transparent font-bold text-primary outline-none cursor-pointer text-sm"
                            >
                                {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>

                         {/* SMART AI MAP BUTTON */}
                         <button 
                            onClick={handleSmartMap} 
                            disabled={aiLoading}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                         >
                             {aiLoading ? <Loader2 className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                             {aiLoading ? 'جاري التحليل...' : 'مطابقة ذكية (AI)'}
                         </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            {FIELD_DEFINITIONS[dataType].map((field) => (
                                <div key={field.key} className="p-4 border rounded-lg hover:border-blue-300 transition-colors bg-white shadow-sm">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                                        <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                                        {columnMapping[field.key] && <CheckCircle size={16} className="text-green-500"/>}
                                    </label>
                                    <select 
                                        className={`w-full p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/20 ${columnMapping[field.key] ? 'border-blue-500 bg-blue-50/20' : ''}`}
                                        value={columnMapping[field.key] || ''}
                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                    >
                                        <option value="">-- تخطي هذا العمود --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Full Table Preview (SYSTEM) */}
            {step === 'PREVIEW_SELECT' && importMode === 'SYSTEM' && !onDataReady && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg border border-green-200">
                                <PlusCircle size={16}/>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-xs opacity-75">سجلات جديدة</span>
                                    <span className="font-bold">{analyzedData.filter(d => d._status === 'NEW').length}</span>
                                </div>
                            </div>
                        </div>

                         {dataType === 'STUDENTS' && (
                            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border">
                                <span className="text-xs font-bold text-gray-500">في حال وجود الطالب:</span>
                                <div className="flex rounded overflow-hidden border border-gray-200">
                                    <button onClick={() => setDuplicateStrategy('UPDATE')} className={`px-3 py-1 text-xs font-bold ${duplicateStrategy === 'UPDATE' ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>دمج وتحديث</button>
                                    <div className="w-[1px] bg-gray-200"></div>
                                    <button onClick={() => setDuplicateStrategy('SKIP')} className={`px-3 py-1 text-xs font-bold ${duplicateStrategy === 'SKIP' ? 'bg-orange-500 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>تجاهل</button>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                             <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold bg-white border px-3 py-2 rounded hover:bg-gray-50">
                                {analyzedData.length > 0 && analyzedData.every(d => selectedRowIndices.has(d._originalIndex)) ? <CheckSquare size={14}/> : <Square size={14}/>}
                                تحديد الكل
                            </button>
                            {selectedRowIndices.size > 0 && (
                                <button onClick={handleRemoveSelected} className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded hover:bg-red-100">
                                    <Trash2 size={14}/> حذف المحدد
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50 relative">
                        <table className="w-full text-right text-sm border-collapse bg-white">
                            <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm text-xs uppercase">
                                <tr>
                                    <th className="p-3 w-10 text-center bg-gray-100 border-b">#</th>
                                    <th className="p-3 w-32 border-b bg-gray-100">الحالة</th>
                                    {Object.keys(processedData[0] || {}).filter(k => !k.startsWith('_') && k !== 'id' && k !== 'studentId').map(k => (
                                        <th key={k} className="p-3 border-b bg-gray-100 font-bold whitespace-nowrap min-w-[120px]">
                                            {FIELD_DEFINITIONS[dataType].find(f => f.key === k)?.label || k}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {analyzedData.map((row) => (
                                    <tr 
                                        key={row._originalIndex} 
                                        className={`transition-colors hover:bg-gray-50 ${!selectedRowIndices.has(row._originalIndex) ? 'opacity-50 bg-gray-50 grayscale' : ''}`}
                                        onClick={() => toggleRowSelection(row._originalIndex)}
                                    >
                                        <td className="p-3 text-center border-l bg-gray-50/50"><input type="checkbox" checked={selectedRowIndices.has(row._originalIndex)} readOnly className="w-4 h-4 rounded text-primary"/></td>
                                        <td className="p-3 border-l">
                                             {row._status === 'NEW' && <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">جديد</span>}
                                             {row._status === 'UPDATE' && <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">دمج</span>}
                                             {row._status === 'SKIP' && <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">مكرر</span>}
                                        </td>
                                        {Object.entries(row).filter(([k]) => !k.startsWith('_') && k !== 'id' && k !== 'studentId').map(([k, val]: any) => (
                                            <td key={k} className={`p-3 border-l border-gray-50 ${row._status === 'UPDATE' && k !== 'nationalId' ? 'bg-blue-50/10' : ''}`}>
                                                {dataType === 'STUDENTS' ? renderComparisonCell(k, row) : <span className="text-gray-700">{String(val)}</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Step 3: Full Table Preview (CUSTOM) - Updated Interactive Version */}
            {step === 'PREVIEW_SELECT' && (importMode === 'CUSTOM' || onDataReady) && (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                                <Sheet size={16} className="text-purple-600"/>
                                <select 
                                    value={selectedSheet} 
                                    onChange={(e) => handleSheetLoad(workbook, e.target.value)} 
                                    className="bg-transparent border-none text-sm font-bold text-purple-800 focus:ring-0 cursor-pointer"
                                >
                                    {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            {!onDataReady && (
                                <input 
                                    className="p-2 border rounded text-sm w-64 focus:ring-2 focus:ring-purple-500" 
                                    placeholder="أدخل اسم للجدول الجديد..." 
                                    value={customTableName}
                                    onChange={e => setCustomTableName(e.target.value)}
                                />
                            )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="text-xs text-gray-500 flex gap-2">
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200">أعمدة: {selectedCustomColumns.size}</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">صفوف: {selectedRowIndices.size}</span>
                            </div>
                            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold bg-white border px-3 py-2 rounded hover:bg-gray-50">
                                {selectedRowIndices.size > 0 && selectedRowIndices.size === rawSheetData.length ? <CheckSquare size={14}/> : <Square size={14}/>}
                                تحديد كل الصفوف
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-2 text-xs text-center text-blue-600 border-b">
                        <MousePointerClick size={14} className="inline mx-1"/>
                         اضغط على <b>عناوين الأعمدة</b> لتحديدها/إلغائها، واستخدم <b>مربعات الاختيار</b> لتحديد الصفوف.
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50">
                        <table className="w-full text-right text-sm border-collapse bg-white">
                            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10 text-center bg-gray-100 border-b">#</th>
                                    {fileHeaders.map(col => {
                                        const isSelected = selectedCustomColumns.has(col);
                                        return (
                                            <th 
                                                key={col} 
                                                onClick={() => toggleCustomColumn(col)}
                                                className={`p-3 border-b whitespace-nowrap cursor-pointer transition-colors select-none group relative ${isSelected ? 'bg-purple-100 text-purple-900 border-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>{col}</span>
                                                    {isSelected && <CheckCircle size={14} className="text-purple-600"/>}
                                                </div>
                                                {!isSelected && <div className="absolute inset-0 bg-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rawSheetData.slice(0, 500).map((row, i) => { // Limit render for perf
                                    const isRowSelected = selectedRowIndices.has(i);
                                    return (
                                        <tr 
                                            key={i} 
                                            className={`transition-colors ${isRowSelected ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 opacity-50 grayscale'}`}
                                            onClick={() => toggleRowSelection(i)}
                                        >
                                            <td className="p-3 text-center border-l">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isRowSelected} 
                                                    readOnly 
                                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                />
                                            </td>
                                            {fileHeaders.map(col => {
                                                const isColSelected = selectedCustomColumns.has(col);
                                                return (
                                                    <td 
                                                        key={col} 
                                                        className={`p-3 border-l whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis ${isColSelected ? 'text-gray-700' : 'text-gray-300 bg-gray-50'}`}
                                                    >
                                                        {row[col]}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    );
                                })}
                                {rawSheetData.length > 500 && (
                                    <tr>
                                        <td colSpan={fileHeaders.length + 1} className="p-4 text-center text-gray-500 bg-gray-50">
                                            ... {rawSheetData.length - 500} صفوف إضافية (مخفية للسرعة) ...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}
        </div>
        
        {/* Messages Toast */}
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

export default DataImport;
