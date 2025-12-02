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

// Heuristic function to guess column mapping based on standard names
export const guessMapping = (headers: string[], fieldType: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    // Helper to find a header containing one of the keywords
    const findHeader = (keywords: string[], exclude: string[] = []) => {
        return headers.find(h => {
            const headerLower = h.toLowerCase();
            const matchesKeyword = keywords.some(k => headerLower.includes(k.toLowerCase()));
            const notExcluded = exclude.length === 0 || !exclude.some(e => headerLower.includes(e.toLowerCase()));
            return matchesKeyword && notExcluded;
        });
    };

    // Common search for National ID
    const nidHeader = findHeader(['id', 'identity', 'national', 'هوية', 'سجل', 'مدني', 'إقامة', 'اقامة']);

    if (fieldType === 'STUDENTS') {
        if (nidHeader) mapping['nationalId'] = nidHeader;

        // 2. Student Name
        const nameHeader = findHeader(['name', 'student', 'الاسم', 'الطالب'], ['parent', 'father', 'ولي']);
        if (nameHeader) mapping['name'] = nameHeader;

        // 3. Grade / Stage
        const gradeHeader = findHeader(['grade', 'level', 'stage', 'الصف', 'المستوى', 'المرحلة']);
        if (gradeHeader) mapping['gradeLevel'] = gradeHeader;

        // 4. Class / Section
        const classHeader = findHeader(['class', 'section', 'الفصل', 'الشعبة']);
        if (classHeader) mapping['className'] = classHeader;

        // 5. Student Phone
        const phoneHeader = findHeader(['phone', 'mobile', 'جوال', 'هاتف'], ['parent', 'father', 'ولي']);
        if (phoneHeader) mapping['phone'] = phoneHeader;

        // 6. Student Email
        const emailHeader = findHeader(['email', 'mail', 'بريد'], ['parent', 'father', 'ولي']);
        if (emailHeader) mapping['email'] = emailHeader;
        
        // 7. Parent Name
        const parentNameHeader = findHeader(['parent', 'father', 'guardian', 'ولي', 'الاب']);
        if (parentNameHeader) mapping['parentName'] = parentNameHeader;

        // 8. Parent Phone
        const parentPhoneHeader = findHeader(['parent phone', 'father phone', 'guardian phone', 'جوال ولي', 'هاتف ولي', 'جوال الاب']);
        if (parentPhoneHeader) mapping['parentPhone'] = parentPhoneHeader;

        // 9. Parent Email
        const parentEmailHeader = findHeader(['parent email', 'father email', 'email parent', 'ايميل ولي', 'بريد ولي', 'ايميل الاب']);
        if (parentEmailHeader) mapping['parentEmail'] = parentEmailHeader;
    } 
    else if (fieldType === 'PERFORMANCE') {
        // Allow matching by ID
        if (nidHeader) mapping['nationalId'] = nidHeader;

        const nameHeader = findHeader(['name', 'student', 'الاسم', 'الطالب']);
        if (nameHeader) mapping['studentName'] = nameHeader;

        const subjectHeader = findHeader(['subject', 'course', 'المادة', 'المقرر']);
        if (subjectHeader) mapping['subject'] = subjectHeader;

        const scoreHeader = findHeader(['score', 'mark', 'result', 'الدرجة', 'النتيجة', 'points']);
        if (scoreHeader) mapping['score'] = scoreHeader;

        const maxHeader = findHeader(['max', 'total', 'out of', 'عظمى', 'الكلية']);
        if (maxHeader) mapping['maxScore'] = maxHeader;

        const titleHeader = findHeader(['title', 'exam', 'quiz', 'العنوان', 'التقييم']);
        if (titleHeader) mapping['title'] = titleHeader;
    }
    else if (fieldType === 'ATTENDANCE') {
        // Allow matching by ID
        if (nidHeader) mapping['nationalId'] = nidHeader;

        const nameHeader = findHeader(['name', 'student', 'الاسم', 'الطالب']);
        if (nameHeader) mapping['studentName'] = nameHeader;

        const statusHeader = findHeader(['status', 'type', 'الحالة', 'الوضع']);
        if (statusHeader) mapping['status'] = statusHeader;
        
        const dateHeader = findHeader(['date', 'time', 'التاريخ', 'الوقت']);
        if (dateHeader) mapping['date'] = dateHeader;
    }

    return mapping;
};

// Helper to parse date from various formats
const parseDate = (dateStr: string | undefined): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle Excel serial date
    if (!isNaN(Number(dateStr))) {
        const date = new Date(Math.round((Number(dateStr) - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }

    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
             return date.toISOString().split('T')[0];
        }
    } catch (e) {
        // ignore
    }
    
    // Fallback for DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/'); // Remove time if exists
        if (parts.length === 3) {
             return parts.reverse().join('-');
        }
    }
    
    return new Date().toISOString().split('T')[0];
};

export const processMappedData = (
    rawRows: any[], 
    mapping: Record<string, string>, 
    type: 'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE',
    existingStudents: Student[] = []
): any[] => {
    const results: any[] = [];

    rawRows.forEach((row) => {
        // Helper to safely get mapped value
        const getVal = (field: string) => {
            const header = mapping[field];
            return header && row[header] !== undefined ? String(row[header]).trim() : undefined;
        };

        if (type === 'STUDENTS') {
            const name = getVal('name');
            const nationalId = getVal('nationalId');
            if (name && nationalId) { // Require Both Name and ID for students logic
                results.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: name,
                    nationalId: nationalId,
                    gradeLevel: getVal('gradeLevel') || 'غير محدد',
                    className: getVal('className') || '',
                    phone: getVal('phone'),
                    email: getVal('email'),
                    parentName: getVal('parentName'),
                    parentPhone: getVal('parentPhone'),
                    parentEmail: getVal('parentEmail')
                });
            }
        } 
        else if (type === 'PERFORMANCE' || type === 'ATTENDANCE') {
            const nid = getVal('nationalId');
            const studentName = getVal('studentName');
            
            let student: Student | undefined;

            // 1. Try match by National ID
            if (nid) {
                student = existingStudents.find(s => s.nationalId === nid);
            }
            
            // 2. Fallback to Name if ID not provided or not found
            if (!student && studentName) {
                student = existingStudents.find(s => s.name.trim() === studentName);
            }

            if (student) {
                if (type === 'PERFORMANCE') {
                    const scoreStr = getVal('score') || '0';
                    let score = parseFloat(scoreStr);
                    let maxScore = parseFloat(getVal('maxScore') || '20');

                    // Handle "15/20" format
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
                     // ATTENDANCE
                    const statusRaw = getVal('status');
                    let status = AttendanceStatus.PRESENT;

                    if (statusRaw) {
                        if (statusRaw.includes('غائب') || statusRaw.toLowerCase().includes('absent')) status = AttendanceStatus.ABSENT;
                        else if (statusRaw.includes('متأخر') || statusRaw.toLowerCase().includes('late')) status = AttendanceStatus.LATE;
                        else if (statusRaw.includes('عذر') || statusRaw.toLowerCase().includes('excused')) status = AttendanceStatus.EXCUSED;
                    }

                    const date = parseDate(getVal('date'));

                    results.push({
                        id: `${student.id}-${date}`,
                        studentId: student.id,
                        studentName: student.name,
                        date: date,
                        status: status
                    });
                }
            }
        }
    });

    return results;
};


// --- Core Excel Functions ---

export const getWorkbookStructure = async (file: File): Promise<{ sheetNames: string[], workbook: any }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        resolve({
            sheetNames: workbook.SheetNames,
            workbook: workbook
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Enhanced function to extract data AND hyperlinks
 */
export const getSheetHeadersAndData = (workbook: any, sheetName: string): { headers: string[], data: any[] } => {
    const worksheet = workbook.Sheets[sheetName];
    
    // 1. Get Raw Data
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    if (rawData.length === 0) return { headers: [], data: [] };
    
    const headers = Object.keys(rawData[0] as object);

    // 2. Scan for Hyperlinks (Sheet object contains a dictionary of cell addresses)
    // We map cell addresses (A1, B2) to hyperlinks
    const linksMap: Record<string, string> = {}; 
    
    Object.keys(worksheet).forEach(cellAddress => {
        if (cellAddress.startsWith('!')) return; // Skip metadata
        const cell = worksheet[cellAddress];
        if (cell.l && cell.l.Target) {
            linksMap[cellAddress] = cell.l.Target;
        }
    });

    // 3. Enrich Data with Link property if exists
    // We need to know which Column Index corresponds to which Header to map address back
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Map column index to Header Name
    const colIndexToHeader: Record<number, string> = {};
    // Assuming headers are in the first row (range.s.r)
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
            colIndexToHeader[C] = String(cell.v);
        }
    }

    const enrichedData = rawData.map((row: any, rowIndex) => {
        const newRow: any = { ...row };
        // The Data rows start after header. 
        // sheet_to_json usually skips header row, so row 0 in data is range.s.r + 1 in Excel
        const excelRowIndex = range.s.r + 1 + rowIndex; 

        Object.keys(newRow).forEach(key => {
            // Find column index for this key
            const colIdx = Object.keys(colIndexToHeader).find(idx => colIndexToHeader[Number(idx)] === key);
            if (colIdx !== undefined) {
                const cellAddr = XLSX.utils.encode_cell({ r: excelRowIndex, c: Number(colIdx) });
                if (linksMap[cellAddr]) {
                    newRow[`${key}_HYPERLINK`] = linksMap[cellAddr]; // Store link in separate field
                }
            }
        });
        return newRow;
    });

    return { headers, data: enrichedData };
};

/**
 * Converts various cloud storage view links to direct download links.
 */
const normalizeDownloadUrl = (url: string): string => {
    let cleanUrl = url.trim();

    // 1. Google Sheets / Drive
    if (cleanUrl.includes('docs.google.com/spreadsheets/d/')) {
        const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
            return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
        }
    }

    // 2. OneDrive / SharePoint
    if (cleanUrl.includes('onedrive.live.com') || cleanUrl.includes('sharepoint.com') || cleanUrl.includes('1drv.ms')) {
        const separator = cleanUrl.includes('?') ? '&' : '?';
        if (!cleanUrl.includes('download=1')) {
            return `${cleanUrl}${separator}download=1`;
        }
    }

    // 3. Dropbox
    if (cleanUrl.includes('dropbox.com')) {
        return cleanUrl.replace('dl=0', 'dl=1');
    }

    return cleanUrl;
};

export const fetchWorkbookStructureUrl = async (url: string): Promise<{ sheetNames: string[], workbook: any }> => {
    const directUrl = normalizeDownloadUrl(url);

    // Increase timeout to 15s for proxies
    const tryFetch = async (targetUrl: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 
        
        try {
            const response = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return await response.arrayBuffer();
        } catch (e) {
            clearTimeout(timeoutId);
            throw e;
        }
    };

    let arrayBuffer: ArrayBuffer | null = null;
    let lastError: any = null;

    // List of strategies to try: Direct -> Proxy 1 (CorsProxy) -> Proxy 2 (AllOrigins)
    const strategies = [
        { name: 'Direct', url: directUrl },
        { name: 'CorsProxy', url: `https://corsproxy.io/?${encodeURIComponent(directUrl)}` },
        { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}` }
    ];

    for (const strategy of strategies) {
        try {
            console.log(`Trying fetch strategy: ${strategy.name}`);
            arrayBuffer = await tryFetch(strategy.url);
            if (arrayBuffer) break; // Success
        } catch (e) {
            console.warn(`${strategy.name} fetch failed:`, e);
            lastError = e;
        }
    }

    if (!arrayBuffer) {
        throw new Error(`فشل تحميل الملف من الرابط. \nسبب محتمل: الرابط مقيد لصلاحيات المنظمة (مثل SharePoint الوزاري) أو محمي.\n\nالحل المقترح: قم بتحميل الملف على جهازك ثم استخدم خيار "رفع ملف" بدلاً من الرابط.\n\n(Error Detail: ${lastError?.message || 'Network Failed'})`);
    }

    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        return {
            sheetNames: workbook.SheetNames,
            workbook: workbook
        };
    } catch (parseError: any) {
        throw new Error(`الملف المحمل تالف أو ليس ملف Excel صالح. \n${parseError.message}`);
    }
};