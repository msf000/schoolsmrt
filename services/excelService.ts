import * as XLSX from 'xlsx';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus } from '../types';

export interface ImportResult {
  success: boolean;
  message: string;
  count: number;
  data?: any[];
}

// Helper to clean headers
export const cleanHeader = (header: string) => header?.toString().trim();

// Fix: Added missing export for extractGoogleSheetId
export const extractGoogleSheetId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

// Fix: Added missing export for fetchGoogleSheetData using Google Sheets API
export const fetchGoogleSheetData = async (sheetId: string, apiKey: string): Promise<{ sheetName: string, headers: string[], data: any[] }> => {
    // 1. Get spreadsheet metadata to find the first sheet name
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`);
    if (!metaResponse.ok) {
        const error = await metaResponse.json();
        throw new Error(`Google Sheets API error: ${error.error?.message || metaResponse.status}`);
    }
    const spreadsheet = await metaResponse.json();
    if (!spreadsheet.sheets || spreadsheet.sheets.length === 0) throw new Error("الملف لا يحتوي على أوراق عمل.");
    
    const sheetName = spreadsheet.sheets[0].properties.title;

    // 2. Get values for that sheet
    const valuesResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`);
    if (!valuesResponse.ok) {
        const error = await valuesResponse.json();
        throw new Error(`Google Sheets API error: ${error.error?.message || valuesResponse.status}`);
    }
    const result = await valuesResponse.json();
    const rows = result.values;
    if (!rows || rows.length === 0) return { sheetName, headers: [], data: [] };

    // 3. Process rows into objects
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1).map((row: any) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
            obj[h] = row[i];
        });
        return obj;
    });

    return { sheetName, headers, data };
};

export const guessMapping = (headers: string[], fieldType: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const findHeader = (keywords: string[], exclude: string[] = []) => {
        return headers.find(h => {
            const headerLower = h.toLowerCase();
            const matchesKeyword = keywords.some(k => headerLower.includes(k.toLowerCase()));
            const notExcluded = exclude.length === 0 || !exclude.some(e => headerLower.includes(e.toLowerCase()));
            return matchesKeyword && notExcluded;
        });
    };
    const nidHeader = findHeader(['id', 'identity', 'national', 'هوية', 'سجل', 'مدني', 'إقامة', 'اقامة']);
    const nameKeywords = ['name', 'student', 'الاسم', 'الطالب', 'اسمك', 'لطالب', 'الاسم الثلاثي', 'الاسم الرباعي', 'الاسم الكامل', 'full name', 'اسم الطالب', 'student_name'];

    if (fieldType === 'STUDENTS') {
        if (nidHeader) mapping['nationalId'] = nidHeader;
        const nameHeader = findHeader(nameKeywords, ['parent', 'father', 'ولي']);
        if (nameHeader) mapping['name'] = nameHeader;
        const gradeHeader = findHeader(['grade', 'level', 'stage', 'الصف', 'المستوى', 'المرحلة']);
        if (gradeHeader) mapping['gradeLevel'] = gradeHeader;
        const classHeader = findHeader(['class', 'section', 'الفصل', 'الشعبة']);
        if (classHeader) mapping['className'] = classHeader;
        const phoneHeader = findHeader(['phone', 'mobile', 'جوال', 'هاتف'], ['parent', 'father', 'ولي']);
        if (phoneHeader) mapping['phone'] = phoneHeader;
        const emailHeader = findHeader(['email', 'mail', 'بريد'], ['parent', 'father', 'ولي']);
        if (emailHeader) mapping['email'] = emailHeader;
        const parentNameHeader = findHeader(['parent', 'father', 'guardian', 'ولي', 'الاب']);
        if (parentNameHeader) mapping['parentName'] = parentNameHeader;
        const parentNameHeaderValue = parentNameHeader; // for consistency
        const parentPhoneHeader = findHeader(['parent phone', 'father phone', 'guardian phone', 'جوال ولي', 'هاتف ولي', 'جوال الاب']);
        if (parentPhoneHeader) mapping['parentPhone'] = parentPhoneHeader;
    } else if (fieldType === 'PERFORMANCE') {
        if (nidHeader) mapping['nationalId'] = nidHeader;
        const nameHeader = findHeader(nameKeywords);
        if (nameHeader) mapping['studentName'] = nameHeader;
        const subjectHeader = findHeader(['subject', 'course', 'المادة', 'المقرر']);
        if (subjectHeader) mapping['subject'] = subjectHeader;
        const scoreHeader = findHeader(['score', 'mark', 'result', 'الدرجة', 'النتيجة', 'points']);
        if (scoreHeader) mapping['score'] = scoreHeader;
        const maxHeader = findHeader(['max', 'total', 'out of', 'عظمى', 'الكلية']);
        if (maxHeader) mapping['maxScore'] = maxHeader;
        const titleHeader = findHeader(['title', 'exam', 'quiz', 'العنوان', 'التقييم']);
        if (titleHeader) mapping['title'] = titleHeader;
    } else if (fieldType === 'ATTENDANCE') {
        if (nidHeader) mapping['nationalId'] = nidHeader;
        const nameHeader = findHeader(nameKeywords);
        if (nameHeader) mapping['studentName'] = nameHeader;
        const statusHeader = findHeader(['status', 'type', 'الحالة', 'الوضع']);
        if (statusHeader) mapping['status'] = statusHeader;
        const dateHeader = findHeader(['date', 'time', 'التاريخ', 'الوقت']);
        if (dateHeader) mapping['date'] = dateHeader;
    }
    return mapping;
};

export const getSheetHeadersAndData = (workbook: any, sheetName: string): { headers: string[], data: any[] } => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return { headers: [], data: [] };
    
    // تأكد من جلب كافة الأعمدة من نطاق الورقة بالكامل
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && cell.v) {
            headers.push(String(cell.v).trim());
        } else {
            // في حال وجود عمود بدون عنوان، نعطيه اسماً افتراضياً
            headers.push(`Column_${C + 1}`);
        }
    }

    // استخراج البيانات مع التأكد من مطابقة الرؤوس
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const rows = data.slice(1).map((row: any) => {
        const obj: any = {};
        headers.forEach((h, i) => {
            obj[h] = row[i];
        });
        return obj;
    });

    return { headers, data: rows };
};

const normalizeDownloadUrl = (url: string): string => {
    let cleanUrl = url.trim();
    if (cleanUrl.includes('docs.google.com/spreadsheets/d/')) {
        const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
    }
    return cleanUrl;
};

export const fetchWorkbookStructureUrl = async (url: string): Promise<{ sheetNames: string[], workbook: any }> => {
    const directUrl = normalizeDownloadUrl(url);
    const tryFetch = async (targetUrl: string) => {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return await response.arrayBuffer();
    };

    try {
        const arrayBuffer = await tryFetch(directUrl);
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        return { sheetNames: workbook.SheetNames, workbook: workbook };
    } catch (e) {
        throw new Error(`فشل تحميل الملف: تأكد من أن ملف Google Sheet متاح "لأي شخص لديه الرابط".`);
    }
};

export const getWorkbookStructure = async (file: File): Promise<{ sheetNames: string[], workbook: any }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        resolve({ sheetNames: workbook.SheetNames, workbook: workbook });
      } catch (err) { reject(err); }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// Fix: Implemented missing logic in processMappedData
export const processMappedData = (rawRows: any[], mapping: Record<string, string>, type: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE', existingStudents: Student[] = []): any[] => {
    const results: any[] = [];
    rawRows.forEach((row) => {
        const getVal = (field: string) => {
            const header = mapping[field];
            return header && row[header] !== undefined ? String(row[header]).trim() : undefined;
        };
        
        if (type === 'STUDENTS') {
            results.push({
                nationalId: getVal('nationalId'),
                name: getVal('name'),
                gradeLevel: getVal('gradeLevel'),
                className: getVal('className'),
                phone: getVal('phone'),
                email: getVal('email'),
                parentName: getVal('parentName'),
                parentPhone: getVal('parentPhone'),
                parentEmail: getVal('parentEmail'),
            });
        } else if (type === 'PERFORMANCE') {
            results.push({
                nationalId: getVal('nationalId'),
                studentName: getVal('studentName'),
                subject: getVal('subject'),
                title: getVal('title'),
                score: getVal('score'),
                maxScore: getVal('maxScore'),
                date: getVal('date'),
            });
        } else if (type === 'ATTENDANCE') {
            results.push({
                nationalId: getVal('nationalId'),
                studentName: getVal('studentName'),
                status: getVal('status'),
                date: getVal('date'),
            });
        }
    });
    return results;
};