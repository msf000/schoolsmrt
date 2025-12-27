
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, LearningStyle, BehaviorIncident } from '../types';

/**
 * خدمة التحليل الإحصائي والتربوي المتقدم
 */

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

export const predictNextScore = (studentId: string, performance: PerformanceRecord[]) => {
    const sPerf = performance.filter(p => p.studentId === studentId).sort((a, b) => a.date.localeCompare(b.date));
    if (sPerf.length < 2) return 80; // افتراضي
    
    const percentages = sPerf.map(p => (p.score / (p.maxScore || 1)) * 100);
    const last = percentages[percentages.length - 1];
    const prev = percentages[percentages.length - 2];
    
    const trend = last - prev;
    const prediction = Math.min(100, Math.max(0, last + (trend * 0.5)));
    return Math.round(prediction);
};

export const getClassPulseData = (attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const last7Days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayAtt = attendance.filter(a => a.date === dateStr);
        const dayPerf = performance.filter(p => p.date === dateStr);
        
        const part = dayAtt.length > 0 ? (dayAtt.filter(a=>a.status===AttendanceStatus.PRESENT).length / dayAtt.length) * 100 : 0;
        const perf = dayPerf.length > 0 ? (dayPerf.reduce((a,b)=>a+(b.score/(b.maxScore||1)),0)/dayPerf.length)*100 : null;

        last7Days.push({
            name: dateStr.slice(5),
            participation: Math.round(part),
            grades: perf !== null ? Math.round(perf) : 0
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
    
    dangerAbsence.forEach(x => alerts.push(`الطالب ${x.student.name.split(' ')[0]} غاب ${x.count} أيام متتالية.`));

    const lowPerf = students.map(s => {
        const sPerf = performance.filter(p => p.studentId === s.id).slice(-3);
        if (sPerf.length < 2) return null;
        const avg = sPerf.reduce((a,b)=>a+(b.score/(b.maxScore||1)),0)/sPerf.length;
        return avg < 0.6 ? s : null;
    }).filter(x => x !== null).slice(0, 1);

    if (lowPerf.length > 0) {
        alerts.push(`انخفاض ملحوظ في مستوى ${lowPerf[0]!.name.split(' ')[0]} أكاديمياً.`);
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
        const recentAbsences = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        if (recentAbsences >= 2) priority += 3;
        return priority > 0 ? { student: s, priority } : null;
    }).filter(x => x !== null).sort((a, b) => b!.priority - a!.priority).slice(0, 3);
};

// Fix for ClassroomManager.tsx errors: Implementation of balanced group generator
export const generateVarkBalancedGroups = (students: Student[], groupSize: number): Student[][] => {
    const groupsByStyle: Record<string, Student[]> = {
        VISUAL: [], AUDITORY: [], READ_WRITE: [], KINESTHETIC: [], UNKNOWN: []
    };
    
    students.forEach(s => {
        const style = s.learningStyle || 'UNKNOWN';
        if (groupsByStyle[style]) groupsByStyle[style].push(s);
        else groupsByStyle['UNKNOWN'].push(s);
    });

    Object.values(groupsByStyle).forEach(arr => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    });

    const balancedList: Student[] = [];
    const styles = Object.keys(groupsByStyle);
    const styleCounters = styles.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<string, number>);

    let addedInThisCycle = true;
    while (addedInThisCycle) {
        addedInThisCycle = false;
        styles.forEach(style => {
            if (styleCounters[style] < groupsByStyle[style].length) {
                balancedList.push(groupsByStyle[style][styleCounters[style]]);
                styleCounters[style]++;
                addedInThisCycle = true;
            }
        });
    }

    const result: Student[][] = [];
    for (let i = 0; i < balancedList.length; i += groupSize) {
        result.push(balancedList.slice(i, i + groupSize));
    }
    return result;
};

// Fix for ClassroomManager.tsx errors: Implementation of local seating arrangement logic
export const generateLocalSeatingPlan = (students: any[], criterion: string) => {
    const cols = 5;
    const sorted = [...students];
    
    if (criterion.includes('المستويات')) {
        sorted.sort((a, b) => (b.stats?.gradeAvg || 0) - (a.stats?.gradeAvg || 0));
        
        const mixed: any[] = [];
        let low = 0;
        let high = sorted.length - 1;
        while (low <= high) {
            mixed.push(sorted[high--]);
            if (low <= high) mixed.push(sorted[low++]);
        }
        
        return {
            seating: mixed.map((s, i) => ({
                studentId: s.id,
                row: Math.floor(i / cols),
                col: i % cols
            }))
        };
    }

    return {
        seating: sorted.map((s, i) => ({
            studentId: s.id,
            row: Math.floor(i / cols),
            col: i % cols
        }))
    };
};
