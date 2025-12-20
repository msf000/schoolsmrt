import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus } from '../types';

/**
 * خدمة التحليل الإحصائي المتقدم (Advanced Local Analysis)
 * بديل برمجي كامل للذكاء الاصطناعي يعتمد على الرياضيات التربوية
 */

// 1. مكتبة النصائح التربوية المحلية (Fallback)
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

// 2. تحليل توزيع درجات الفصل
export const calculateClassStats = (performance: PerformanceRecord[]) => {
    if (performance.length === 0) return null;

    const scores = performance.map(p => (p.score / p.maxScore) * 100);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    
    // حساب الانحراف المعياري (Standard Deviation) لمعرفة تباين المستوى
    const squareDiffs = scores.map(s => Math.pow(s - avg, 2));
    const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / scores.length);

    // تصنيف الطلاب حسب المجموعات الإحصائية
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

// 3. كاشف المخاطر الأكاديمية (المنطق الإحصائي)
export const detectAtRiskStudents = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    return students.map(s => {
        const sAtt = attendance.filter(a => a.studentId === s.id);
        const sPerf = performance.filter(p => p.studentId === s.id);
        
        const absentRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length / sAtt.length) * 100 : 0;
        const avgScore = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 100;
        
        const risks = [];
        if (absentRate > 20) risks.push(`تجاوز غيابه نسبة الحرمان (${Math.round(absentRate)}%)`);
        if (avgScore < 60) risks.push(`معدل إتقان منخفض جداً (${Math.round(avgScore)}%)`);
        
        // التحقق من تدهور المستوى (آخر 3 درجات مقارنة بالمتوسط)
        if (sPerf.length >= 5) {
            const last3 = sPerf.slice(-3).reduce((a, b) => a + (b.score / b.maxScore), 0) / 3 * 100;
            if (last3 < avgScore - 15) risks.push("تراجع مفاجئ في الدرجات الأخيرة");
        }

        return risks.length > 0 ? { student: s, risks } : null;
    }).filter(item => item !== null);
};

// 4. توليد تقرير أداء الطالب المحلي (محدث)
export const generateLocalStudentReport = (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const totalDays = attendance.length;
    const absent = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;

    const avg = performance.length > 0 
        ? Math.round(performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length * 100) 
        : 0;

    const strengths = [];
    const weaknesses = [];

    if (avg >= 90) strengths.push("تميز أكاديمي لافت واستقرار في المستوى");
    if (attRate >= 95) strengths.push("انضباط عالي جداً وحرص على الحضور");
    
    if (avg < 60) weaknesses.push("تراجع ملحوظ في مستوى التحصيل الأكاديمي");
    if (attRate < 80) weaknesses.push("كثرة الغياب تؤثر على الاستيعاب");

    return `
### تقرير الأداء الإحصائي: ${student.name}
---
- نسبة الانضباط: **${attRate}%**
- متوسط الإتقان: **${avg}%**

**نقاط القوة:**
${strengths.map(s => `- ${s}`).join('\n') || '- لا توجد بيانات كافية حالياً'}

**التحديات:**
${weaknesses.map(w => `- ${w}`).join('\n') || '- السجل لا يظهر تحديات كبرى'}

*هذا التقرير تم توليده برمجياً بناءً على السجلات الرقمية.*
    `.trim();
};

export const generateLocalDailyBrief = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAtt = attendance.filter(a => a.date === today);
    const absentCount = todaysAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const lowPerf = performance.filter(p => (p.score / p.maxScore) < 0.6).length;

    return `
📊 **ملخص الفصل اليوم (إحصائي):**
1. طلاب غائبون اليوم: (${absentCount})
2. مهام دون مستوى الإتقان: (${lowPerf})
3. الحالة العامة: ${absentCount > students.length * 0.1 ? 'تنبيه: غياب مرتفع اليوم' : 'الفصل مستقر وبحالة جيدة'}
    `.trim();
};

export const generateLocalSeatingPlan = (students: any[], criteria: string) => {
    const sorted = [...students].sort((a, b) => (b.stats?.gradeAvg || 0) - (a.stats?.gradeAvg || 0));
    const seating = [];
    const cols = 4;
    
    if (criteria.includes('مزج')) {
        let left = 0; let right = sorted.length - 1; let index = 0;
        while (left <= right) {
            const student = (index % 2 === 0) ? sorted[left++] : sorted[right--];
            seating.push({ studentId: student.id, row: Math.floor(index / cols) + 1, col: (index % cols) + 1 });
            index++;
        }
    } else {
        sorted.forEach((s, i) => { seating.push({ studentId: s.id, row: Math.floor(i / cols) + 1, col: (i % cols) + 1 }); });
    }
    return { seating, reasoning: "توزيع إحصائي مبني على متوسط درجات الطلاب لضمان توازن المجموعات." };
};
