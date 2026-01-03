
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, LearningStyle, BehaviorIncident, ExamResult } from '../types';

/**
 * محرك التوقعات والتحليلات المتقدمة (SaaS Analytics Engine)
 */

// 1. حساب "مؤشر صحة الفصل" - يجمع بين الانضباط والتحصيل
export const calculateClassHealth = (className: string, students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const classStudents = students.filter(s => s.className === className);
    if (classStudents.length === 0) return 0;
    
    const studentIds = new Set(classStudents.map(s => s.id));
    const classAtt = attendance.filter(a => studentIds.has(a.studentId));
    const classPerf = performance.filter(p => studentIds.has(p.studentId));
    
    const attRate = classAtt.length > 0 ? (classAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / classAtt.length) : 1;
    const perfRate = classPerf.length > 0 ? (classPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / classPerf.length) : 0.8;
    
    // معادلة الترجيح: 40% انضباط، 60% تحصيل
    return Math.round(((attRate * 0.4) + (perfRate * 0.6)) * 100);
};

// 2. التنبؤ بالدرجة القادمة للطالب بناءً على الاتجاه الحالي (Trend Analysis)
export const predictNextScore = (studentId: string, performance: PerformanceRecord[]) => {
    const sPerf = performance.filter(p => p.studentId === studentId).sort((a, b) => a.date.localeCompare(b.date));
    if (sPerf.length < 2) return 80; // افتراضي في غياب البيانات التراكمية
    
    const percentages = sPerf.map(p => (p.score / (p.maxScore || 1)) * 100);
    const last = percentages[percentages.length - 1];
    const prev = percentages[percentages.length - 2];
    
    const momentum = last - prev; // الزخم (Momentum)
    const prediction = Math.min(100, Math.max(0, last + (momentum * 0.4)));
    return Math.round(prediction);
};

// 3. حساب معدل النمو بين اختبارين (Growth Engine)
export const calculateGrowthMetrics = (preResults: ExamResult[], postResults: ExamResult[], students: Student[]) => {
    const comparison = students.map(s => {
        const pre = preResults.find(r => r.studentId === s.id);
        const post = postResults.find(r => r.studentId === s.id);
        
        if (!pre || !post) return null;
        
        const prePct = (pre.score / pre.totalScore) * 100;
        const postPct = (post.score / post.totalScore) * 100;
        const growth = postPct - prePct;
        
        return {
            studentId: s.id,
            studentName: s.name,
            prePct: Math.round(prePct),
            postPct: Math.round(postPct),
            growth: Math.round(growth),
            isPositive: growth >= 0
        };
    }).filter(item => item !== null);
    
    const avgGrowth = comparison.length > 0 
        ? comparison.reduce((acc, curr) => acc + curr!.growth, 0) / comparison.length 
        : 0;
        
    return { comparison: comparison as any[], avgGrowth: Math.round(avgGrowth) };
};

// 4. تحديد الطلاب تحت الخطر (Early Warning System)
export const detectAtRiskStudents = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id);
        const sPerf = performance.filter(p => p.studentId === s.id);
        
        const absentRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length / sAtt.length) * 100 : 0;
        const avgScore = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 100;
        
        const risks = [];
        if (absentRate > 25) risks.push(`غياب حرج (${Math.round(absentRate)}%)`);
        if (avgScore < 50) risks.push(`تعثر أكاديمي حاد (${Math.round(avgScore)}%)`);
        
        return risks.length > 0 ? { student: s, risks } : null;
    }).filter(item => item !== null) as { student: Student, risks: string[] }[];
};

// 5. حساب مؤشر الثبات (Consistency Index)
export const calculateStudentConsistency = (studentId: string, performance: PerformanceRecord[]) => {
    const sPerf = performance.filter(p => p.studentId === studentId);
    if (sPerf.length < 3) return 100;
    
    const scores = sPerf.map(p => (p.score / p.maxScore) * 100);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance); // الانحراف المعياري
    
    // كلما قل الانحراف، زاد الثبات
    return Math.round(Math.max(0, 100 - (stdDev * 2)));
};

/**
 * 6. تقسيم الطلاب لمجموعات متوازنة بناءً على نمط التعلم (VARK Balanced Groups)
 */
export const generateVarkBalancedGroups = (students: Student[], groupSize: number): Student[][] => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const byStyle: Record<string, Student[]> = {
        VISUAL: [], AUDITORY: [], READ_WRITE: [], KINESTHETIC: [], UNKNOWN: []
    };
    
    shuffled.forEach(s => {
        const style = s.learningStyle || 'UNKNOWN';
        if (byStyle[style]) {
            byStyle[style].push(s);
        } else {
            byStyle['UNKNOWN'].push(s);
        }
    });

    const numGroups = Math.ceil(students.length / groupSize);
    if (numGroups === 0) return [];
    
    const groups: Student[][] = Array.from({ length: numGroups }, () => []);

    const stylesOrder = ['VISUAL', 'AUDITORY', 'READ_WRITE', 'KINESTHETIC', 'UNKNOWN'];
    let gIdx = 0;
    
    stylesOrder.forEach(style => {
        byStyle[style].forEach(student => {
            groups[gIdx].push(student);
            gIdx = (gIdx + 1) % numGroups;
        });
    });

    return groups;
};
