import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStudentAnalysis = async (
  student: Student,
  attendance: AttendanceRecord[],
  performance: PerformanceRecord[]
): Promise<string> => {
  
  // 1. Prepare data context
  const studentAttendance = attendance.filter(a => a.studentId === student.id);
  const studentPerformance = performance.filter(p => p.studentId === student.id);

  const presentCount = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
  const absentCount = studentAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
  const lateCount = studentAttendance.filter(a => a.status === AttendanceStatus.LATE).length;

  const performanceSummary = studentPerformance.map(p => 
    `- مادة: ${p.subject}, العنوان: ${p.title}, الدرجة: ${p.score}/${p.maxScore}`
  ).join('\n');

  const prompt = `
    قم بتحليل أداء الطالب التالي كمعلم خبير.
    
    بيانات الطالب:
    الاسم: ${student.name}
    الصف: ${student.gradeLevel}
    
    بيانات الحضور:
    - أيام الحضور: ${presentCount}
    - أيام الغياب: ${absentCount}
    - أيام التأخير: ${lateCount}
    
    سجل الدرجات والأداء:
    ${performanceSummary.length > 0 ? performanceSummary : "لا توجد سجلات درجات متاحة."}
    
    المطلوب:
    اكتب تقريراً قصيراً ومحفزاً (حوالي 100 كلمة) باللغة العربية موجه لولي الأمر والمعلم.
    1. لخص مستوى التزام الطالب بالحضور.
    2. حلل المستوى الأكاديمي بناءً على الدرجات.
    3. قدم نصيحة واحدة للتحسين.
    لا تستخدم مقدمات رسمية جداً، ادخل في الموضوع مباشرة.
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