
import * as XLSX from 'xlsx';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, LearningStyle } from '../types';

export interface ImportResult {
  success: boolean;
  message: string;
  count: number;
  data?: any[];
}

const VARK_KEYWORDS = {
    VISUAL: ['رؤية', 'صور', 'فيديو', 'خريطة', 'رسم', 'مخطط', 'تخيل', 'شرائح', 'ملامحه'],
    AUDITORY: ['استماع', 'صوتي', 'محاضرة', 'تحدث', 'نقاش', 'تكراره', 'سماعه', 'صوته', 'نطق'],
    READ_WRITE: ['قراءة', 'كتابة', 'نص', 'دفتر', 'تعليمات', 'ملخصات', 'ملاحظات', 'مذكرات', 'إرشادات'],
    KINESTHETIC: ['تطبيق', 'تجربة', 'عملي', 'حركات', 'مشي', 'لمسه', 'بيدي', 'تطبيقها', 'تجربتها', 'أزرار']
};

export const analyzeVarkLocally = (rawData: any[]): any => {
    const studentAssignments: any[] = [];
    const stats = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0 };

    rawData.forEach(row => {
        const studentName = row['اسمك الرباعي'] || row['الاسم'] || row['اسم الطالب'] || 'طالب مجهول';
        const scores = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0 };

        Object.values(row).forEach(val => {
            const text = String(val);
            if (VARK_KEYWORDS.VISUAL.some(k => text.includes(k))) scores.VISUAL++;
            if (VARK_KEYWORDS.AUDITORY.some(k => text.includes(k))) scores.AUDITORY++;
            if (VARK_KEYWORDS.READ_WRITE.some(k => text.includes(k))) scores.READ_WRITE++;
            if (VARK_KEYWORDS.KINESTHETIC.some(k => text.includes(k))) scores.KINESTHETIC++;
        });

        let dominant: LearningStyle = 'UNKNOWN';
        let maxScore = 0;

        (Object.keys(scores) as (keyof typeof scores)[]).forEach(style => {
            if (scores[style] > maxScore) {
                maxScore = scores[style];
                dominant = style as LearningStyle;
            }
        });

        if (dominant !== 'UNKNOWN') {
            stats[dominant as keyof typeof stats]++;
            studentAssignments.push({ studentName, style: dominant, confidence: 'local-match' });
        }
    });

    return { studentAssignments, stats, tips: ["النمط البصري يفضل الخرائط الذهنية.", "النمط السمعي يستفيد من النقاشات.", "النمط القرائي يفضل التلخيص.", "النمط الحركي يحتاج لتجارب عملية."] };
};

export const cleanHeader = (header: string) => header?.toString().trim();

export const extractGoogleSheetId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

export const fetchGoogleSheetData = async (sheetId: string, apiKey: string): Promise<{ sheetName: string, headers: string[], data: any[] }> => {
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`);
    if (!metaResponse.ok) throw new Error("تأكد من أن الرابط عام (Public) أو مفتاح الـ API صحيح.");
    
    const spreadsheet = await metaResponse.json();
    const sheetName = spreadsheet.sheets[0].properties.title;
    
    const valuesResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`);
    const result = await valuesResponse.json();
    const rows = result.values;
    if (!rows || rows.length === 0) return { sheetName, headers: [], data: [] };

    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1).map((row: any) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => { obj[h] = row[i]; });
        return obj;
    });

    return { sheetName, headers, data };
};

export const guessMapping = (headers: string[], fieldType: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const findHeader = (keywords: string[], exclude: string[] = []) => {
        return headers.find(h => {
            const headerLower = h.toLowerCase();
            return keywords.some(k => headerLower.includes(k.toLowerCase())) && !exclude.some(e => headerLower.includes(e.toLowerCase()));
        });
    };

    const nameKeys = ['name', 'student', 'الاسم', 'الطالب', 'اسمك'];
    const idKeys = ['id', 'identity', 'national', 'هوية', 'سجل'];

    if (fieldType === 'STUDENTS') {
        const id = findHeader(idKeys); if (id) mapping['nationalId'] = id;
        const name = findHeader(nameKeys, ['parent', 'ولي']); if (name) mapping['name'] = name;
        const phone = findHeader(['phone', 'mobile', 'جوال'], ['parent', 'ولي']); if (phone) mapping['phone'] = phone;
    } else if (fieldType === 'PERFORMANCE') {
        const id = findHeader(idKeys); if (id) mapping['nationalId'] = id;
        const name = findHeader(nameKeys); if (name) mapping['studentName'] = name;
        const score = findHeader(['score', 'mark', 'الدرجة', 'النتيجة', 'points']); if (score) mapping['score'] = score;
    }
    return mapping;
};

// Added processMappedData to handle column remapping of imported rows
export const processMappedData = (rawData: any[], mapping: Record<string, string>, type: string, existingStudents: any[]): any[] => {
    return rawData.map(row => {
        const mappedRow: any = {};
        Object.entries(mapping).forEach(([field, header]) => {
            if (header) {
                mappedRow[field] = row[header];
            }
        });
        return mappedRow;
    });
};

export const getSheetHeadersAndData = (workbook: any, sheetName: string): { headers: string[], data: any[] } => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return { headers: [], data: [] };
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = (data[0] as any[]).map(h => String(h).trim());
    const rows = (data.slice(1) as any[]).map((row: any) => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
    });
    return { headers, data: rows };
};

export const fetchWorkbookStructureUrl = async (url: string): Promise<{ sheetNames: string[], workbook: any }> => {
    let cleanUrl = url.trim();
    if (cleanUrl.includes('docs.google.com/spreadsheets/d/')) {
        const id = extractGoogleSheetId(cleanUrl);
        cleanUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
    }
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`);
    if (!response.ok) throw new Error("فشل الوصول للملف سحابياً.");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return { sheetNames: workbook.SheetNames, workbook };
};

export const getWorkbookStructure = async (file: File): Promise<{ sheetNames: string[], workbook: any }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target?.result, { type: 'array' });
      resolve({ sheetNames: workbook.SheetNames, workbook });
    };
    reader.readAsArrayBuffer(file);
  });
};
