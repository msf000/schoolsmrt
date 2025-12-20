import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus } from '../types';

/**
 * خدمة التحليل المحلي (Local Analysis Service)
 * تقوم بإجراء العمليات التحليلية بناءً على الإحصائيات والمعايير التربوية
 */

// 1. توليد تقرير أداء الطالب المحلي
export const generateLocalStudentReport = (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const totalDays = attendance.length;
    const absent = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;

    const avg = performance.length > 0 
        ? Math.round(performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length * 100) 
        : 0;

    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // تحليل نقاط القوة
    if (avg >= 90) strengths.push("تميز أكاديمي لافت واستقرار في المستوى");
    if (attRate >= 95) strengths.push("انضباط عالي جداً وحرص على الحضور");
    
    const homeworks = performance.filter(p => p.category === 'HOMEWORK');
    const hwAvg = homeworks.length > 0 ? homeworks.reduce((a,b)=>a+(b.score/b.maxScore),0)/homeworks.length : 0;
    if (hwAvg >= 0.85) strengths.push("التزام تام بتسليم المهام والواجبات في وقتها");

    // تحليل التحديات
    if (avg < 60) weaknesses.push("تراجع ملحوظ في مستوى التحصيل الأكاديمي");
    if (attRate < 80) weaknesses.push("كثرة الغياب تؤثر بشكل مباشر على استيعاب الدروس");
    
    const exams = performance.filter(p => p.category === 'PLATFORM_EXAM');
    const examAvg = exams.length > 0 ? exams.reduce((a,b)=>a+(b.score/b.maxScore),0)/exams.length : 0;
    if (examAvg < 0.6 && homeworks.length > 0) weaknesses.push("فجوة بين الأداء في الواجبات والنتائج في الاختبارات");

    // التوصيات
    if (avg < 70) recommendations.push("إدراج الطالب ضمن خطة الدعم والتقوية");
    if (attRate < 85) recommendations.push("التواصل مع ولي الأمر لبحث أسباب الغياب المتكرر");
    recommendations.push("تشجيع الطالب على المشاركة الصفية لزيادة الثقة بالنفس");

    return `
### تقرير الأداء الإحصائي للطلالب: ${student.name}

**1. ملخص المؤشرات:**
- نسبة الانضباط: **${attRate}%**
- متوسط الإتقان العام: **${avg}%**
- إجمالي الغياب: **${absent} أيام**

**2. نقاط القوة:**
${strengths.map(s => `- ${s}`).join('\n') || '- لا توجد بيانات كافية حالياً'}

**3. التحديات (نقاط التحسين):**
${weaknesses.map(w => `- ${w}`).join('\n') || '- السجل لا يظهر تحديات كبرى حالياً'}

**4. التوصية التربوية:**
${recommendations.map(r => `- ${r}`).join('\n')}
    `.trim();
};

// 2. خوارزمية توزيع المقاعد المحلية
export const generateLocalSeatingPlan = (students: any[], criteria: string) => {
    // ترتيب الطلاب حسب المستوى (من الأعلى للأقل)
    const sorted = [...students].sort((a, b) => (b.stats?.gradeAvg || 0) - (a.stats?.gradeAvg || 0));
    
    const seating = [];
    const cols = 4; // افتراضي 4 أعمدة
    
    if (criteria.includes('مزج')) {
        // خوارزمية المتفوق بجانب المتعثر (Interleaving)
        let left = 0;
        let right = sorted.length - 1;
        let index = 0;
        
        while (left <= right) {
            const student = (index % 2 === 0) ? sorted[left++] : sorted[right--];
            seating.push({
                studentId: student.id,
                row: Math.floor(index / cols) + 1,
                col: (index % cols) + 1
            });
            index++;
        }
    } else {
        // ترتيب تقليدي حسب المستوى
        sorted.forEach((s, i) => {
            seating.push({
                studentId: s.id,
                row: Math.floor(i / cols) + 1,
                col: (i % cols) + 1
            });
        });
    }

    return {
        seating,
        reasoning: "تم التوزيع برمجياً بناءً على معايير التحصيل الأكاديمي لضمان بيئة تعليمية متوازنة."
    };
};

// 3. ملخص اليوم الإحصائي (بديل الموجز الذكي)
export const generateLocalDailyBrief = (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAtt = attendance.filter(a => a.date === today);
    const absentCount = todaysAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
    
    const lowPerf = performance.filter(p => (p.score / p.maxScore) < 0.6).length;

    return `
📊 **ملخص الفصل اليوم:**
1. عدد الطلاب الغائبين: (${absentCount}) طلاب.
2. تم رصد (${lowPerf}) درجات دون مستوى الإتقان مؤخراً.
3. حالة الفصل العامة تبدو مستقرة، يفضل التركيز على مراجعة مفاهيم الدرس السابق.
    `.trim();
};
