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

const parseDate = (dateStr: string | undefined): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (!isNaN(Number(dateStr))) {
        const date = new Date(Math.round((Number(dateStr) - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch (e) {}
    if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length === 3) return parts.reverse().join('-');
    }
    return new Date().toISOString().split('T')[0];
};

export const processMappedData = (rawRows: any[], mapping: Record<string, string>, type: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE', existingStudents: Student[] = []): any[] => {
    const results: any[] = [];
    rawRows.forEach((row) => {
        const getVal = (field: string) => {
            const header = mapping[field];
            return header && row[header] !== undefined ? String(row[header]).trim() : undefined;
        };
        if (type === 'STUDENTS') {
            const name = getVal('name');
            const nationalId = getVal('nationalId');
            if (name && nationalId) {
                results.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: name,
                    role: 'STUDENT',
                    nationalId: nationalId,
                    gradeLevel: getVal('gradeLevel') || 'غير محدد',
                    className: getVal('className') || '',
                    phone: getVal('phone'),
                    parentName: getVal('parentName'),
                    parentPhone: getVal('parentPhone'),
                });
            }
        } else if (type === 'PERFORMANCE' || type === 'ATTENDANCE') {
            const nid = getVal('nationalId');
            const studentName = getVal('studentName');
            let student = nid ? existingStudents.find(s => s.nationalId === nid) : undefined;
            if (!student && studentName) student = existingStudents.find(s => s.name.trim() === studentName || s.name.includes(studentName));
            if (student) {
                if (type === 'PERFORMANCE') {
                    const scoreStr = getVal('score') || '0';
                    let score = parseFloat(scoreStr);
                    let maxScore = parseFloat(getVal('maxScore') || '20');
                    if (scoreStr.includes('/')) {
                        const parts = scoreStr.split('/');
                        score = parseFloat(parts[0]);
                        maxScore = parseFloat(parts[1]);
                    }
                    results.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        studentId: student.id,
                        studentName: student.name,
                        subject: getVal('subject') || 'عام',
                        title: getVal('title') || 'تقييم',
                        score: isNaN(score) ? 0 : score,
                        maxScore: isNaN(maxScore) ? 20 : maxScore,
                        date: parseDate(getVal('date'))
                    });
                } else {
                    const statusRaw = getVal('status');
                    let status = AttendanceStatus.PRESENT;
                    if (statusRaw) {
                        if (statusRaw.includes('غائب') || statusRaw.toLowerCase().includes('absent')) status = AttendanceStatus.ABSENT;
                        else if (statusRaw.includes('متأخر') || statusRaw.toLowerCase().includes('late')) status = AttendanceStatus.LATE;
                        else if (statusRaw.includes('عذر') || statusRaw.toLowerCase().includes('excused')) status = AttendanceStatus.EXCUSED;
                    }
                    results.push({
                        id: `${student.id}-${parseDate(getVal('date'))}`,
                        studentId: student.id,
                        studentName: student.name,
                        date: parseDate(getVal('date')),
                        status: status,
                    });
                }
            }
        }
    });
    return results;
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

export const getSheetHeadersAndData = (workbook: any, sheetName: string): { headers: string[], data: any[] } => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return { headers: [], data: [] };
    
    // تأكد من جلب كافة الرؤوس من نطاق الورقة بالكامل
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && cell.v) headers.push(String(cell.v).trim());
        else headers.push(`Column_${C + 1}`); // Fallback
    }

    const data = XLSX.utils.sheet_to_json(worksheet);
    return { headers, data };
};

export const extractGoogleSheetId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

export const fetchGoogleSpreadsheetMeta = async (sheetId: string, apiKey: string) => {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
        const error = await metaRes.json();
        throw new Error(error.error?.message || 'فشل الوصول لبيانات الملف.');
    }
    const metaJson = await metaRes.json();
    return { title: metaJson.properties.title, sheets: metaJson.sheets.map((s: any) => s.properties.title) as string[] };
};

export const fetchGoogleSheetData = async (sheetId: string, apiKey: string, sheetName?: string) => {
    let targetSheet = sheetName;
    if (!targetSheet) {
        const meta = await fetchGoogleSpreadsheetMeta(sheetId, apiKey);
        targetSheet = meta.sheets[0];
    }
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(targetSheet)}?key=${apiKey}`;
    const dataRes = await fetch(dataUrl);
    if (!dataRes.ok) throw new Error('فشل جلب البيانات من الورقة.');
    const dataJson = await dataRes.json();
    const rows = dataJson.values || [];
    if (rows.length === 0) return { sheetName: targetSheet, headers: [], data: [] };
    const headers = rows[0];
    const data = rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => { obj[h] = row[i]; });
        return obj;
    });
    return { sheetName: targetSheet, headers, data };
};

const normalizeDownloadUrl = (url: string): string => {
    let cleanUrl = url.trim();
    if (cleanUrl.includes('docs.google.com/spreadsheets/d/')) {
        const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
    }
    if (cleanUrl.includes('onedrive.live.com') || cleanUrl.includes('sharepoint.com') || cleanUrl.includes('1drv.ms')) {
        const separator = cleanUrl.includes('?') ? '&' : '?';
        if (!cleanUrl.includes('download=1')) return `${cleanUrl}${separator}download=1`;
    }
    if (cleanUrl.includes('dropbox.com')) return cleanUrl.replace('dl=0', 'dl=1');
    return cleanUrl;
};

export const fetchWorkbookStructureUrl = async (url: string): Promise<{ sheetNames: string[], workbook: any }> => {
    const directUrl = normalizeDownloadUrl(url);
    const tryFetch = async (targetUrl: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 
        try {
            const response = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return await response.arrayBuffer();
        } catch (e) { clearTimeout(timeoutId); throw e; }
    };
    let arrayBuffer: ArrayBuffer | null = null;
    const strategies = [
        { name: 'Direct', url: directUrl },
        { name: 'CorsProxy', url: `https://corsproxy.io/?${encodeURIComponent(directUrl)}` },
        { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}` }
    ];
    for (const strategy of strategies) {
        try {
            arrayBuffer = await tryFetch(strategy.url);
            if (arrayBuffer) break;
        } catch (e) {}
    }
    if (!arrayBuffer) throw new Error(`فشل تحميل الملف من الرابط. يرجى تجربة رفع الملف يدوياً.`);
    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        return { sheetNames: workbook.SheetNames, workbook: workbook };
    } catch (parseError: any) {
        throw new Error(`الملف المحمل تالف أو ليس ملف Excel صالح.`);
    }
};