
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, LearningStyle, BehaviorIncident } from '../types';

/**
 * خدمة التحليل الإحصائي والتربوي المتقدم
 */

const PEDAGOGICAL_TIPS = [
    "شجع الطلاب على 'التعلم بالتعليم'؛ اطلب من المتفوقين شرح نقطة بسيطة لزملائهم.",
    "استخدم استراتيجية 'فكر، شارك، زميلك' لزيادة التفاعل الصفي دون مجهود كبير.",
    "التغذية الراجعة الفورية هي أقوى محرك للتعلم؛ صحح ولو جزءاً بسيطاً من الواجب أمام الطالب.",
    "نظم المقاعد بشكل دائري اليوم إذا كان الدرس يعتمد على النقاش.",
    "الطلاب ذوي النمط الحركي يحتاجون للحركة كل 20 دقيقة؛ اطلب منهم توزيع الأوراق أو مسح السبورة.",
    "تذكر أن الثناء على الجهد وليس الذكاء يبني عقلية النمو لدى الطلاب."
];

export const getLocalPedagogicalTip = () => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return PEDAGOGICAL_TIPS[dayOfYear % PEDAGOGICAL_TIPS.length];
};

export const calculateClassHealth = (className: string, students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const classStudents = students.filter(s => s.className === className);
    if (classStudents.length === 0) return 0;
    
    const studentIds = new Set(classStudents.map(s => s.id));
    const classAtt = attendance.filter(a => studentIds.has(a.studentId));
    const classPerf = performance.filter(p => studentIds.has(p.studentId));
    
    const attRate = classAtt.length > 0 ? (classAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / classAtt.length) : 1;
    const perfRate = classPerf.length > 0 ? (classPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / classPerf.length) : 0.8;
    
    return Math.round(((attRate * 0.4) + (perfRate * 0.6)) * 100);
};

export const calculateClassTrend = (className: string, students: Student[], performance: PerformanceRecord[]) => {
    const classStudents = students.filter(s => s.className === className);
    if (classStudents.length === 0) return 0;
    
    const studentIds = new Set(classStudents.map(s => s.id));
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const currentWeekPerf = performance.filter(p => studentIds.has(p.studentId) && new Date(p.date) >= weekAgo);
    const lastWeekPerf = performance.filter(p => studentIds.has(p.studentId) && new Date(p.date) >= twoWeeksAgo && new Date(p.date) < weekAgo);
    
    const getAvg = (list: PerformanceRecord[]) => list.length > 0 ? (list.reduce((a, b) => a + (b.score / b.maxScore), 0) / list.length) : 0;
    
    const currentAvg = getAvg(currentWeekPerf);
    const lastAvg = getAvg(lastWeekPerf);
    
    if (lastAvg === 0) return currentAvg > 0 ? 100 : 0;
    return Math.round(((currentAvg - lastAvg) / lastAvg) * 100);
};

export const predictNextScore = (studentId: string, performance: PerformanceRecord[]) => {
    const sPerf = performance.filter(p => p.studentId === studentId).sort((a, b) => a.date.localeCompare(b.date));
    if (sPerf.length < 2) return null;
    
    const percentages = sPerf.map(p => (p.score / p.maxScore) * 100);
    const last = percentages[percentages.length - 1];
    const prev = percentages[percentages.length - 2];
    
    const trend = last - prev;
    const prediction = Math.min(100, Math.max(0, last + (trend * 0.5)));
    return Math.round(prediction);
};

export const getClassPulseData = (attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const last7Days = [];
    const safeAttendance = Array.isArray(attendance) ? attendance : [];
    const safePerformance = Array.isArray(performance) ? performance : [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayAtt = safeAttendance.filter(a => a.date === dateStr);
        const dayPerf = safePerformance.filter(p => p.date === dateStr);
        
        const avgParticipation = dayAtt.length > 0 
            ? (dayAtt.reduce((acc, curr) => acc + (curr.participationScore || 0), 0) / dayAtt.length) * 20 
            : 0;
            
        const avgGrades = dayPerf.length > 0
            ? (dayPerf.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 1)), 0) / dayPerf.length) * 100
            : null;

        last7Days.push({
            name: dateStr.slice(5),
            participation: Math.round(avgParticipation),
            grades: avgGrades !== null ? Math.round(avgGrades) : 0
        });
    }
    return last7Days;
};

export const getUrgentAlerts = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const alerts: string[] = [];
    if (!students || students.length === 0) return alerts;

    const dangerAbsence = students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id);
        const absentCount = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        return { student: s, count: absentCount };
    }).filter(x => x.count >= 3).slice(0, 2);
    
    dangerAbsence.forEach(x => alerts.push(`الطالب ${x.student.name.split(' ')[0]} غاب ${x.count} أيام.`));

    const lowPerformers = detectAtRiskStudents(students, attendance, performance).slice(0, 1);
    if (lowPerformers.length > 0) {
        alerts.push(`تراجع أداء ${lowPerformers[0].student.name.split(' ')[0]} في التقييمات الأخيرة.`);
    }

    return alerts;
};

export const detectAtRiskStudents = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id);
        const sPerf = performance.filter(p => p.studentId === s.id);
        const absentRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length / sAtt.length) * 100 : 0;
        const avgScore = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 100;
        const risks = [];
        if (absentRate > 20) risks.push(`غياب مرتفع (${Math.round(absentRate)}%)`);
        if (avgScore < 60) risks.push(`ضعف في نواتج التعلم (${Math.round(avgScore)}%)`);
        return risks.length > 0 ? { student: s, risks } : null;
    }).filter(item => item !== null) as { student: Student, risks: string[] }[];
};

export const getDailyFocusStudents = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id).slice(-5);
        let priority = 0;
        let reasons: string[] = [];

        const avgPart = sAtt.reduce((acc, curr) => acc + (curr.participationScore || 0), 0) / (sAtt.length || 1);
        if (avgPart < 2 && sAtt.length > 0) { priority += 2; reasons.push("تفاعل منخفض"); }

        const recentAbsences = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        if (recentAbsences >= 2) { priority += 3; reasons.push("غياب متكرر"); }

        return priority > 0 ? { student: s, priority, reasons } : null;
    }).filter(x => x !== null).sort((a, b) => b!.priority - a!.priority).slice(0, 3);
};

export const getTopAchievers = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sPerf = performance.filter(p => p.studentId === s.id);
        const avg = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 0;
        return { student: s, score: avg };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
};

export const generateLocalDailyBrief = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAtt = attendance.filter(a => a.date === today);
    const absentCount = todaysAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const lowPerf = performance.filter(p => (p.score / (p.maxScore || 1)) < 0.6).length;
    return `موجز اليوم: غياب (${absentCount}) طلاب. تعثر في (${lowPerf}) مهام. الفصل يحتاج تركيزاً على المشاركة الصفية.`;
};

export const generateLocalSeatingPlan = (students: any[], criterion: string) => {
    const sorted = [...students];
    
    if (criterion.includes('المستوى')) {
        sorted.sort((a, b) => (b.stats?.gradeAvg || 0) - (a.stats?.gradeAvg || 0));
    }
    
    const seating = sorted.map((s, i) => ({
        studentId: s.id,
        row: Math.floor(i / 5),
        col: i % 5
    }));
    
    return { seating };
};

export const generateVarkBalancedGroups = (students: Student[], groupSize: number): Student[][] => {
    const totalGroups = Math.ceil(students.length / groupSize);
    if (totalGroups <= 0) return [];
    
    const groups: Student[][] = Array.from({ length: totalGroups }, () => []);
    const sorted = [...students].sort((a, b) => (a.learningStyle || '').localeCompare(b.learningStyle || ''));
    
    sorted.forEach((student, index) => {
        groups[index % totalGroups].push(student);
    });
    
    return groups;
};
