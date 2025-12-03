import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStudentAnalysis = async (
  student: Student,
  attendance: AttendanceRecord[],
  performance: PerformanceRecord[]
): Promise<string> => {
  
  // 1. Prepare data context
  const studentAttendance = attendance.filter(a => a.studentId === student.id);
  const studentPerformance = performance.filter(p => p.studentId === student.id);

  // Attendance Stats
  const presentCount = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
  const absentCount = studentAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
  const lateCount = studentAttendance.filter(a => a.status === AttendanceStatus.LATE).length;

  // Behavior Stats
  const positiveBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE);
  const negativeBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE);
  
  const behaviorSummary = `
  - سلوك إيجابي: ${positiveBehaviors.length} مرات. (أبرز الملاحظات: ${positiveBehaviors.map(a => a.behaviorNote).filter(Boolean).slice(0, 5).join(', ') || 'لا يوجد'})
  - سلوك سلبي: ${negativeBehaviors.length} مرات. (أبرز الملاحظات: ${negativeBehaviors.map(a => a.behaviorNote).filter(Boolean).slice(0, 5).join(', ') || 'لا يوجد'})
  `;

  const performanceSummary = studentPerformance.map(p => 
    `- مادة: ${p.subject}, العنوان: ${p.title}, الدرجة: ${p.score}/${p.maxScore}`
  ).join('\n');

  const prompt = `
    قم بتحليل أداء الطالب التالي كمعلم خبير وموجه طلابي في مدرسة.
    
    بيانات الطالب:
    الاسم: ${student.name}
    الصف: ${student.gradeLevel}
    
    بيانات الحضور:
    - أيام الحضور: ${presentCount}
    - أيام الغياب: ${absentCount}
    - أيام التأخير: ${lateCount}

    بيانات السلوك والمواظبة (مهم جداً):
    ${behaviorSummary}
    
    سجل الدرجات والأداء الأكاديمي:
    ${performanceSummary.length > 0 ? performanceSummary : "لا توجد سجلات درجات متاحة."}
    
    المطلوب:
    اكتب تقريراً قصيراً وشاملاً (حوالي 120 كلمة) باللغة العربية موجه لولي الأمر.
    1. لخص مستوى التزام الطالب بالحضور.
    2. قيم السلوك والانضباط داخل الفصل بناءً على الملاحظات المسجلة أعلاه.
    3. حلل المستوى الأكاديمي ونقاط القوة والضعف.
    4. قدم نصيحة تربوية محددة وعملية للتحسين.
    
    الأسلوب: مهني، مشجع، ومباشر. ابدأ التحليل مباشرة بدون مقدمات رسمية طويلة.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "لم يتم إنشاء تحليل.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "عذراً، حدث خطأ أثناء تحليل البيانات بواسطة الذكاء الاصطناعي.";
  }
};