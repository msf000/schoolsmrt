import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye, Sheet, ArrowRight, Table, CheckSquare, Square, Settings, RefreshCw, Copy, PlusCircle, Link as LinkIcon, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Merge, ArrowRightCircle } from 'lucide-react';
import { getWorkbookStructure, getSheetHeadersAndData, fetchWorkbookStructureUrl, guessMapping, processMappedData } from '../services/excelService';
import { Student } from '../types';

interface DataImportProps {
  onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
  onImportPerformance: (records: any[]) => void;
  onImportAttendance?: (records: any[]) => void;
  existingStudents: Student[];
  forcedType?: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'; 
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
        { key: 'status', label: 'الحالة (حاضر/غائب)', required: true },
        { key: 'date', label: 'التاريخ', required: false },
    ]
};

const DataImport: React.FC<DataImportProps> = ({ onImportStudents, onImportPerformance, onImportAttendance, existingStudents, forcedType }) => {
  // Config
  const [importMode, setImportMode] = useState<'EXCEL' | 'URL'>('EXCEL');
  const [dataType, setDataType] = useState<'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'>(forcedType || 'STUDENTS');
  
  // Strategy Config (For Students Only)
  const [matchKey, setMatchKey] = useState<keyof Student>('nationalId');
  
  // Default to 'UPDATE' for enrichment scenarios (Adding email/phone to existing students)
  const [duplicateStrategy, setDuplicateStrategy] = useState<'UPDATE' | 'SKIP' | 'NEW'>('UPDATE');
  const [allowedUpdateFields, setAllowedUpdateFields] = useState<string[]>([]);

  // Flow Control
  const [step, setStep] = useState<'UPLOAD' | 'SHEET_SELECT' | 'MAPPING' | 'PREVIEW_SELECT'>('UPLOAD');
  
  // File Data
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Transformation Data
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawSheetData, setRawSheetData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  // Preview & Selection Data
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
      if(forcedType) setDataType(forcedType);
  }, [forcedType]);

  // When mapping changes, initialize allowed update fields to all mapped fields
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
  };

  // --- Step 1: Upload & Scan ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleScan = async () => {
      setLoading(true);
      setStatus(null);
      try {
          let structure;
          if (importMode === 'EXCEL') {
              if (!file) throw new Error('الرجاء اختيار ملف أولاً.');
              structure = await getWorkbookStructure(file);
          } else {
              if (!url) throw new Error('الرجاء إدخال رابط الملف.');
              structure = await fetchWorkbookStructureUrl(url);
          }
          
          setWorkbook(structure.workbook);
          setSheetNames(structure.sheetNames);
          
          if (structure.sheetNames.length > 0) {
              // Select first sheet by default
              handleSheetSelect(structure.workbook, structure.sheetNames[0]);
          } else {
              throw new Error("الملف لا يحتوي على أوراق عمل.");
          }
      } catch (error: any) {
          setStatus({ type: 'error', message: error.message });
      } finally {
          setLoading(false);
      }
  };

  // --- Step 2: Sheet Select & Header Extraction ---
  const handleSheetSelect = (wb: any, sheetName: string) => {
      setSelectedSheet(sheetName);
      const { headers, data } = getSheetHeadersAndData(wb, sheetName);
      setFileHeaders(headers);
      setRawSheetData(data);
      
      // Auto-guess mapping
      const guessed = guessMapping(headers, dataType);
      setColumnMapping(guessed);
      
      setStep('MAPPING');
  };

  // --- Step 3: Column Mapping ---
  const handleMappingChange = (fieldKey: string, header: string) => {
      setColumnMapping(prev => ({ ...prev, [fieldKey]: header }));
  };

  const handleProceedToPreview = () => {
      // 1. Validate General Required Fields
      const requiredFields = FIELD_DEFINITIONS[dataType].filter(f => f.required);
      const missing = requiredFields.filter(f => !columnMapping[f.key]);
      
      if (missing.length > 0) {
          setStatus({ type: 'error', message: `يرجى تحديد الأعمدة للحقول الإجبارية: ${missing.map(f => f.label).join(', ')}` });
          return;
      }

      // 2. Conditional Validation for Performance/Attendance (Need either National ID OR Name)
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
          // Default select all
          setSelectedRowIndices(new Set(processed.map((_, i) => i)));
          setRemovedIndices(new Set());
          setStep('PREVIEW_SELECT');
          setStatus(null);
          setLoading(false);
      }, 500);
  };

  // --- Step 4: Logic for Matching Visualization ---
  const analyzedData = useMemo(() => {
      let data = processedData.map((row, index) => {
          // Default state
          let _status: 'NEW' | 'UPDATE' | 'SKIP' = 'NEW';
          let _existingMatch: any = null;
          let _simulatedResult: any = { ...row }; // Default: the result is the incoming row

          if (dataType === 'STUDENTS') {
              // Strict Matching by National ID Only as Primary Key
              const rowNid = row.nationalId ? String(row.nationalId).trim() : null;
              
              if (rowNid) {
                  _existingMatch = existingStudents.find(s => s.nationalId === rowNid);
              }

              if (_existingMatch) {
                  if (duplicateStrategy === 'UPDATE') {
                      _status = 'UPDATE';
                      // Simulate the merge: Start with existing data
                      _simulatedResult = { ..._existingMatch };
                      
                      // Apply allowed updates from incoming row
                      allowedUpdateFields.forEach(field => {
                          const incomingVal = row[field];
                          // Only update if incoming is not empty
                          if (incomingVal !== undefined && incomingVal !== null && String(incomingVal).trim() !== '') {
                              _simulatedResult[field] = incomingVal;
                          }
                      });
                  }
                  else if (duplicateStrategy === 'SKIP') {
                       _status = 'SKIP';
                       _simulatedResult = _existingMatch; // No change
                  }
                  else {
                       _status = 'NEW'; // Effectively skipped in backend logic for ID collision, but marked as NEW in UI if user forced
                  }
              }
          }

          return {
              ...row,
              _originalIndex: index, // Keep track of original index
              _status,
              _existingMatch,
              _simulatedResult // This is what the user wants to see
          };
      });

      // Filter out removed rows
      data = data.filter(r => !removedIndices.has(r._originalIndex));

      // Apply sorting
      if (sortConfig) {
          data.sort((a, b) => {
              // We sort based on the final simulated result
              const aVal = a._simulatedResult[sortConfig.key] || '';
              const bVal = b._simulatedResult[sortConfig.key] || '';
              
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return data;
  }, [processedData, existingStudents, matchKey, duplicateStrategy, dataType, sortConfig, removedIndices, allowedUpdateFields]);

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };


  // --- Step 4: Selection & Final Import ---
  const toggleRowSelection = (originalIndex: number) => {
      const newSet = new Set(selectedRowIndices);
      if (newSet.has(originalIndex)) newSet.delete(originalIndex);
      else newSet.add(originalIndex);
      setSelectedRowIndices(newSet);
  };

  const handleRemoveSelected = () => {
      if (selectedRowIndices.size === 0) return;
      if (window.confirm(`هل أنت متأكد من حذف ${selectedRowIndices.size} صف من قائمة الاستيراد؟`)) {
          const newRemoved = new Set(removedIndices);
          selectedRowIndices.forEach(idx => newRemoved.add(idx));
          setRemovedIndices(newRemoved);
          setSelectedRowIndices(new Set()); // Clear selection
      }
  };

  const toggleSelectAll = () => {
      // Toggle only VISIBLE rows
      const visibleIndices = analyzedData.map(d => d._originalIndex);
      const allSelected = visibleIndices.every(idx => selectedRowIndices.has(idx));
      
      const newSet = new Set(selectedRowIndices);
      if (allSelected) {
          visibleIndices.forEach(idx => newSet.delete(idx));
      } else {
          visibleIndices.forEach(idx => newSet.add(idx));
      }
      setSelectedRowIndices(newSet);
  };

  const toggleUpdateField = (fieldKey: string) => {
      if (allowedUpdateFields.includes(fieldKey)) {
          setAllowedUpdateFields(prev => prev.filter(f => f !== fieldKey));
      } else {
          setAllowedUpdateFields(prev => [...prev, fieldKey]);
      }
  };

  const handleFinalImport = () => {
      setLoading(true);
      try {
          const finalData = analyzedData
              .filter((item) => selectedRowIndices.has(item._originalIndex))
              // Remove our internal flags before sending to storage
              .map(({ _status, _existingMatch, _originalIndex, _simulatedResult, ...rest }) => rest);
          
          if (finalData.length === 0) throw new Error("لم يتم اختيار أي سجلات للاستيراد.");

          if (dataType === 'STUDENTS') {
              onImportStudents(finalData, matchKey, duplicateStrategy, allowedUpdateFields);
          } else if (dataType === 'ATTENDANCE' && onImportAttendance) {
              onImportAttendance(finalData);
          } else if (dataType === 'PERFORMANCE') {
              onImportPerformance(finalData);
          }

          setStatus({ 
              type: 'success', 
              message: `تم استيراد ${finalData.length} سجل بنجاح!` 
          });
          // Optional: reset after delay or keep success message
      } catch (error: any) {
          setStatus({ type: 'error', message: error.message });
      } finally {
          setLoading(false);
      }
  };

  // --- Comparison Renderer Helper ---
  const renderComparisonCell = (key: string, row: any) => {
    // We are now rendering the _simulatedResult (The final state)
    // We compare it against _existingMatch to highlight changes
    
    const finalVal = row._simulatedResult[key];
    const existingVal = row._existingMatch ? row._existingMatch[key] : undefined;
    
    // If it's a new record entirely
    if (!row._existingMatch) {
        return <span className="font-bold text-gray-800">{finalVal || '-'}</span>;
    }

    // If matches existing, check if value changed
    const hasChanged = String(finalVal || '').trim() !== String(existingVal || '').trim();
    const wasEmpty = !existingVal || String(existingVal).trim() === '';

    if (hasChanged) {
        return (
            <div className="flex flex-col relative group">
                <span className="font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 w-fit">
                    {finalVal}
                </span>
                {wasEmpty ? (
                    <span className="absolute -top-2 -right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="بيانات جديدة"></span>
                ) : (
                    <span className="text-[10px] text-gray-400 line-through mt-0.5" title="القيمة السابقة">
                        {existingVal}
                    </span>
                )}
            </div>
        );
    }

    // No change (Existing data)
    return <span className="text-gray-500 text-sm">{finalVal || '-'}</span>;
  };

  // --- Renders ---

  return (
    <div className="p-2 w-full animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
            {!forcedType && (
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileSpreadsheet className="text-green-600" />
                    استيراد البيانات
                </h2>
            )}
            <p className="text-gray-500 mt-2 text-sm">
                {step === 'UPLOAD' && '1. رفع الملف واختيار النوع'}
                {step === 'MAPPING' && '2. مطابقة الأعمدة'}
                {step === 'PREVIEW_SELECT' && '3. معاينة النتيجة النهائية (بعد الدمج)'}
            </p>
        </div>
        
        {/* TOP ACTION BUTTONS */}
        <div className="flex gap-3">
             {step !== 'UPLOAD' && (
                 <button onClick={resetState} className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm bg-gray-100 px-4 py-2 rounded-lg font-bold">
                     <ArrowRight size={16}/> البداية
                 </button>
             )}
             
             {step === 'MAPPING' && (
                  <button onClick={handleProceedToPreview} disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Table size={18}/>}
                        <span>معاينة النتائج</span>
                   </button>
             )}

             {step === 'PREVIEW_SELECT' && (
                <>
                    <button onClick={() => setStep('MAPPING')} className="px-6 py-2 border text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-bold">
                        عودة للمطابقة
                    </button>
                    <button 
                        onClick={handleFinalImport} 
                        disabled={loading || selectedRowIndices.size === 0}
                        className="bg-primary hover:bg-teal-800 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all font-bold"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                        <span>تأكيد العملية ({selectedRowIndices.size})</span>
                    </button>
                </>
             )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        
        {/* VIEW: UPLOAD */}
        {step === 'UPLOAD' && (
            <div className="p-8">
                 {/* Type Selection - Hide if forced */}
                 {!forcedType && (
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-3">ماذا تريد أن تستورد؟</label>
                        <div className="flex gap-4">
                            <SelectionCard 
                                active={dataType === 'STUDENTS'} 
                                onClick={() => setDataType('STUDENTS')}
                                title="بيانات الطلاب"
                                desc="الأسماء، الصفوف، أرقام التواصل"
                            />
                            <SelectionCard 
                                active={dataType === 'PERFORMANCE'} 
                                onClick={() => setDataType('PERFORMANCE')}
                                title="درجات وتقييمات"
                                desc="اختبارات، واجبات، مشاركات"
                            />
                            <SelectionCard 
                                active={dataType === 'ATTENDANCE'} 
                                onClick={() => setDataType('ATTENDANCE')}
                                title="سجل الحضور"
                                desc="حضور وغياب يومي"
                            />
                        </div>
                    </div>
                 )}

                <div className="mb-6">
                    <div className="flex border-b border-gray-200 w-fit mb-4">
                        <button onClick={() => setImportMode('EXCEL')} className={`pb-2 px-4 text-sm font-medium ${importMode === 'EXCEL' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>ملف Excel / CSV</button>
                        <button onClick={() => setImportMode('URL')} className={`pb-2 px-4 text-sm font-medium ${importMode === 'URL' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>رابط خارجي</button>
                    </div>

                    {importMode === 'EXCEL' ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform">
                                <Upload className="text-gray-400 group-hover:text-primary" size={48} />
                                <span className="text-gray-600 font-medium">{file ? file.name : 'اضغط لاختيار ملف من جهازك'}</span>
                            </div>
                        </div>
                    ) : (
                         <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-3 border rounded-lg dir-ltr text-left" />
                    )}
                </div>

                <div className="flex justify-end">
                    <button onClick={handleScan} disabled={loading || (importMode === 'EXCEL' && !file) || (importMode === 'URL' && !url)} className="bg-primary text-white px-8 py-3 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        <span>متابعة</span>
                    </button>
                </div>
            </div>
        )}

        {/* VIEW: MAPPING */}
        {step === 'MAPPING' && (
            <div className="flex flex-col h-full">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Sheet className="text-green-600"/>
                        <select 
                            value={selectedSheet} 
                            onChange={(e) => handleSheetSelect(workbook, e.target.value)}
                            className="bg-white border rounded p-1 text-sm font-medium"
                        >
                            {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                     <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">وجدنا {fileHeaders.length} أعمدة في الملف</span>
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                    <h3 className="font-bold text-gray-800 mb-6">مطابقة الأعمدة</h3>
                    <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                        {FIELD_DEFINITIONS[dataType].map((field) => (
                            <div key={field.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-700 flex items-center gap-2">
                                        {field.label}
                                        {field.required && <span className="text-red-500 text-xs">* مطلوب</span>}
                                        {/* @ts-ignore */}
                                        {field.isUnique && <span className="text-blue-500 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100">مفتاح ربط محتمل</span>}
                                    </span>
                                    <span className="text-xs text-gray-400">الحقل في النظام</span>
                                </div>
                                <ArrowLeft className="text-gray-300" size={20} />
                                <div className="w-1/2">
                                    <select 
                                        className={`w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 ${columnMapping[field.key] ? 'border-primary/50 ring-primary/10' : 'border-gray-200'}`}
                                        value={columnMapping[field.key] || ''}
                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                    >
                                        <option value="">-- تجاهل هذا الحقل --</option>
                                        {fileHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                     <div className="text-red-500 text-sm font-medium">{status?.type === 'error' && status.message}</div>
                     {/* Buttons Moved to Top */}
                </div>
            </div>
        )}

        {/* VIEW: PREVIEW & SELECT */}
        {step === 'PREVIEW_SELECT' && (
            <div className="flex flex-col h-full">
                {/* Advanced Options Bar (Only for Students Import) */}
                {dataType === 'STUDENTS' && (
                    <div className="bg-white border-b border-gray-200 shadow-sm z-30">
                        <div className="p-4 bg-gradient-to-l from-blue-50 to-white flex flex-col gap-4">
                            
                            {/* Row 1: Link & Strategy */}
                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1"><LinkIcon size={14}/> خيارات التعامل مع بيانات الطالب (رقم الهوية)</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-500 mb-1">في حال وجود رقم الهوية مسبقاً</label>
                                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                                 <button 
                                                    onClick={() => setDuplicateStrategy('UPDATE')}
                                                    className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${duplicateStrategy === 'UPDATE' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    <Merge size={12}/> دمج وتحديث البيانات
                                                </button>
                                                <div className="w-[1px] bg-gray-200"></div>
                                                <button 
                                                    onClick={() => setDuplicateStrategy('SKIP')}
                                                    className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${duplicateStrategy === 'SKIP' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    <ArrowRight size={12}/> تجاهل الموجود
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 bg-blue-50 p-2 rounded border border-blue-100 text-xs text-blue-800">
                                        {duplicateStrategy === 'UPDATE' 
                                            ? '✅ سيتم عرض النتيجة النهائية لدمج البيانات في الجدول أدناه. الحقول المحدثة ستظهر باللون الأخضر.'
                                            : '⚠️ سيتم تجاهل أي طالب موجود مسبقاً، ولن يتم تعديل بياناته.'
                                        }
                                    </div>
                                </div>
                                <div className="flex gap-4 text-center">
                                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                                        <span className="block text-xl font-bold text-green-700">{analyzedData.filter(d => d._status === 'NEW').length}</span>
                                        <span className="text-xs text-green-600">جديد (إضافة)</span>
                                    </div>
                                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                        <span className="block text-xl font-bold text-blue-700">{analyzedData.filter(d => d._status === 'UPDATE').length}</span>
                                        <span className="text-xs text-blue-600">موجود (دمج)</span>
                                    </div>
                                    <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
                                        <span className="block text-xl font-bold text-orange-700">{analyzedData.filter(d => d._status === 'SKIP').length}</span>
                                        <span className="text-xs text-orange-600">مكرر (تجاهل)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Selective Update (Only if UPDATE is selected) */}
                            {duplicateStrategy === 'UPDATE' && (
                                <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">
                                        <Settings size={12}/> حدد البيانات التي تريد إضافتها/تحديثها للطالب الموجود:
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(columnMapping).filter(k => k !== 'nationalId').map(key => {
                                             const fieldLabel = FIELD_DEFINITIONS.STUDENTS.find(f => f.key === key)?.label || key;
                                             const isSelected = allowedUpdateFields.includes(key);
                                             return (
                                                 <button 
                                                    key={key}
                                                    onClick={() => toggleUpdateField(key)}
                                                    className={`
                                                        px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border transition-all
                                                        ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}
                                                    `}
                                                 >
                                                     {isSelected ? <CheckSquare size={12}/> : <Square size={12}/>}
                                                     {fieldLabel}
                                                 </button>
                                             )
                                        })}
                                        {Object.keys(columnMapping).filter(k => k !== 'nationalId').length === 0 && (
                                            <span className="text-xs text-gray-500">لا توجد حقول أخرى معينة للتحديث.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                <div className="p-2 bg-gray-50 border-b flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-primary hover:bg-primary/5 px-3 py-1 rounded transition-colors">
                            {analyzedData.every(d => selectedRowIndices.has(d._originalIndex)) ? <CheckSquare size={18}/> : <Square size={18}/>}
                            تحديد الكل
                        </button>
                        <span className="text-sm text-gray-600">تم تحديد {selectedRowIndices.size} للاستيراد</span>
                        
                        {selectedRowIndices.size > 0 && (
                            <button 
                                onClick={handleRemoveSelected}
                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors"
                            >
                                <Trash2 size={14}/>
                                حذف المحدد من القائمة
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-auto max-h-[500px]">
                    <table className="w-full text-right text-sm border-collapse">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                {dataType === 'STUDENTS' && <th className="p-3 border-b font-medium w-32 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('_status')}>
                                    <div className="flex items-center gap-1">نوع العملية {sortConfig?.key === '_status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                </th>}
                                {Object.keys(processedData[0] || {}).filter(k => !k.startsWith('_') && k !== 'id' && k !== 'studentId').map(k => (
                                    <th key={k} className="p-3 border-b font-medium cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort(k)}>
                                        <div className="flex items-center gap-1">
                                            {FIELD_DEFINITIONS[dataType].find(f => f.key === k)?.label || k}
                                            {sortConfig?.key === k ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>
                                            ) : <ArrowUpDown size={12} className="text-gray-300"/>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {analyzedData.map((row) => (
                                <tr 
                                    key={row._originalIndex} 
                                    className={`
                                        transition-colors cursor-pointer border-l-4
                                        ${selectedRowIndices.has(row._originalIndex) ? 'bg-blue-50/30' : ''}
                                        ${row._status === 'UPDATE' ? 'border-l-blue-500' : row._status === 'NEW' ? 'border-l-green-500' : 'border-l-orange-400 opacity-60'}
                                    `} 
                                    onClick={() => toggleRowSelection(row._originalIndex)}
                                >
                                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedRowIndices.has(row._originalIndex)} 
                                            onChange={() => toggleRowSelection(row._originalIndex)}
                                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                        />
                                    </td>
                                    
                                    {/* Status Column for Students */}
                                    {dataType === 'STUDENTS' && (
                                        <td className="p-3">
                                            {row._status === 'NEW' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">جديد</span>}
                                            {row._status === 'UPDATE' && (
                                                <div className="flex flex-col">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold w-fit mb-1 whitespace-nowrap">دمج بيانات</span>
                                                    {row._existingMatch && (
                                                        <span className="text-[10px] text-gray-400">للطالب: {row._existingMatch.name}</span>
                                                    )}
                                                </div>
                                            )}
                                            {row._status === 'SKIP' && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap">تجاهل (موجود)</span>}
                                        </td>
                                    )}

                                    {Object.entries(row).filter(([k]) => !k.startsWith('_') && k !== 'id' && k !== 'studentId').map(([k, val]: any) => (
                                        <td key={k} className="p-3">
                                            {dataType === 'STUDENTS' 
                                                ? renderComparisonCell(k, row) 
                                                : <span className="text-gray-700">{String(val)}</span>
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {analyzedData.length === 0 && <div className="p-10 text-center text-gray-400">لا توجد بيانات صالحة للعرض.</div>}
                </div>

                <div className="p-4 border-t flex justify-between items-center bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                     <div className="flex-1">
                         {status && (
                            <div className={`flex items-center gap-2 ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span className="font-medium text-sm">{status.message}</span>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

const SelectionCard = ({ active, onClick, title, desc }: any) => (
    <div 
        onClick={onClick}
        className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${active ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
    >
        <div className={`w-4 h-4 rounded-full border mb-2 flex items-center justify-center ${active ? 'border-primary' : 'border-gray-300'}`}>
            {active && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <h4 className={`font-bold ${active ? 'text-primary' : 'text-gray-700'}`}>{title}</h4>
        <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
);

export default DataImport;