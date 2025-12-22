
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, LearningStyle, BehaviorIncident } from '../types';

/**
 * خدمة التحليل الإحصائي المتقدم (Advanced Local Analysis)
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

export const calculateClassStats = (performance: PerformanceRecord[]) => {
    if (performance.length === 0) return null;
    const scores = performance.map(p => (p.score / p.maxScore) * 100);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const squareDiffs = scores.map(s => Math.pow(s - avg, 2));
    const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / scores.length);

    const distribution = {
        EXCELLENT: scores.filter(s => s >= 90).length,
        GOOD: scores.filter(s => s >= 75 && s < 90).length,
        AVERAGE: scores.filter(s => s >= 60 && s < 75).length,
        LOW: scores.filter(s => s < 60).length
    };

    return {
        avg: Math.round(avg),
        stdDev: Math.round(stdDev * 10) / 10,
        distribution,
        highest: Math.max(...scores),
        lowest: Math.min(...scores)
    };
};

export const detectAtRiskStudents = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id);
        const sPerf = performance.filter(p => p.studentId === s.id);
        const absentRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length / sAtt.length) * 100 : 0;
        const avgScore = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 100;
        const risks = [];
        if (absentRate > 20) risks.push(`تجاوز غيابه نسبة الحرمان (${Math.round(absentRate)}%)`);
        if (avgScore < 60) risks.push(`معدل إتقان منخفض جداً (${Math.round(avgScore)}%)`);
        if (sPerf.length >= 5) {
            const last3 = sPerf.slice(-3).reduce((a, b) => a + (b.score / b.maxScore), 0) / 3 * 100;
            if (last3 < avgScore - 15) risks.push("تراجع مفاجئ في الدرجات الأخيرة");
        }
        return risks.length > 0 ? { student: s, risks } : null;
    }).filter(item => item !== null) as { student: Student, risks: string[] }[];
};

export const getDailyFocusStudents = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id).slice(-5);
        const sPerf = performance.filter(p => p.studentId === s.id).slice(-3);
        
        let priority = 0;
        let reasons: string[] = [];

        // معيار 1: انقطاع التفاعل (النجوم)
        const avgPart = sAtt.reduce((acc, curr) => acc + (curr.participationScore || 0), 0) / (sAtt.length || 1);
        if (avgPart < 2 && sAtt.length > 0) {
            priority += 2;
            reasons.push("خامل صفياً مؤخراً");
        }

        // معيار 2: غياب متقطع
        const recentAbsences = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        if (recentAbsences >= 2) {
            priority += 3;
            reasons.push("تذبذب في الحضور");
        }

        // معيار 3: متفوق يحتاج تحدي
        const avgPerf = sPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0) / (sPerf.length || 1);
        if (avgPerf > 0.95) {
            priority += 1;
            reasons.push("متفوق يحتاج إثراء");
        }

        return priority > 0 ? { student: s, priority, reasons } : null;
    })
    .filter(x => x !== null)
    .sort((a, b) => b!.priority - a!.priority)
    .slice(0, 3);
};

export const getTopAchievers = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sPerf = performance.filter(p => p.studentId === s.id);
        const avg = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 0;
        const behaviorPoints = s.behaviorPoints || 0;
        return { student: s, score: avg + (behaviorPoints * 0.1) };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
};

export const generateLocalStudentReport = (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const totalDays = attendance.length;
    const absent = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;
    const avg = performance.length > 0 ? Math.round(performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length * 100) : 0;
    const strengths = [];
    const weaknesses = [];
    if (avg >= 90) strengths.push("تميز أكاديمي لافت واستقرار في المستوى");
    if (attRate >= 95) strengths.push("انضباط عالي جداً وحرص على الحضور");
    if (avg < 60) weaknesses.push("تراجع ملحوظ في مستوى التحصيل الأكاديمي");
    if (attRate < 80) weaknesses.push("كثرة الغياب تؤثر على الاستيعاب");
    return `### تقرير الأداء الإحصائي: ${student.name}\n---\n- نسبة الانضباط: **${attRate}%**\n- متوسط الإتقان: **${avg}%**\n\n**نقاط القوة:**\n${strengths.map(s => `- ${s}`).join('\n') || '- لا توجد بيانات كافية حالياً'}\n\n**التحديات:**\n${weaknesses.map(w => `- ${w}`).join('\n') || '- السجل لا يظهر تحديات كبرى'}\n\n*هذا التقرير تم توليده برمجياً بناءً على السجلات الرقمية.*`.trim();
};

export const generateLocalDailyBrief = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAtt = attendance.filter(a => a.date === today);
    const absentCount = todaysAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const lowPerf = performance.filter(p => (p.score / p.maxScore) < 0.6).length;
    return `\n📊 **ملخص الفصل اليوم (إحصائي):**\n1. طلاب غائبون اليوم: (${absentCount})\n2. مهام دون مستوى الإتقان: (${lowPerf})\n3. الحالة العامة: ${absentCount > students.length * 0.1 ? 'تنبيه: غياب مرتفع اليوم' : 'الفصل مستقر وبحالة جيدة'}\n`.trim();
};

export const generateLocalSeatingPlan = (students: any[], criteria: string) => {
    const sorted = [...students].sort((a, b) => (b.stats?.gradeAvg || 0) - (a.stats?.gradeAvg || 0));
    const seating = [];
    const cols = 4;
    if (criteria.includes('مزج')) {
        let left = 0; let right = sorted.length - 1; let indexCount = 0;
        while (left <= right) {
            const student = (indexCount % 2 === 0) ? sorted[left++] : sorted[right--];
            seating.push({ studentId: student.id, row: Math.floor(indexCount / cols) + 1, col: (indexCount % cols) + 1 });
            indexCount++;
        }
    } else {
        sorted.forEach((s, i) => { 
            seating.push({ studentId: s.id, row: Math.floor(i / cols) + 1, col: (i % cols) + 1 }); 
        });
    }
    return { seating, reasoning: "توزيع إحصائي مبني على متوسط درجات الطلاب لضمان توازن المجموعات." };
};

export const generateVarkBalancedGroups = (students: Student[], groupSize: number) => {
    const groups: Student[][] = [];
    const numGroups = Math.ceil(students.length / groupSize);
    if (numGroups === 0) return [];
    for (let i = 0; i < numGroups; i++) groups.push([]);

    const pool: Record<string, Student[]> = { VISUAL: [], AUDITORY: [], READ_WRITE: [], KINESTHETIC: [], UNKNOWN: [] };
    students.forEach(s => {
        pool[s.learningStyle || 'UNKNOWN'].push(s);
    });

    Object.keys(pool).forEach(k => pool[k].sort(() => Math.random() - 0.5));

    let currentGroupIdx = 0;
    const stylesOrder: LearningStyle[] = ['VISUAL', 'AUDITORY', 'KINESTHETIC', 'READ_WRITE', 'UNKNOWN'];

    stylesOrder.forEach(style => {
        pool[style].forEach(student => {
            groups[currentGroupIdx].push(student);
            currentGroupIdx = (currentGroupIdx + 1) % numGroups;
        });
    });

    return groups;
};
