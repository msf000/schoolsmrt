
import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Existing Analysis Function ---
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

// --- NEW: Quiz Generator ---
export const generateQuiz = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    questionCount: number = 5,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
): Promise<string> => {
    const prompt = `
    بصفتك معلماً خبيراً لمادة ${subject}، قم بإنشاء اختبار قصير (Quiz) للطلاب في ${gradeLevel || 'المرحلة العامة'}.
    
    الموضوع: ${topic}
    عدد الأسئلة: ${questionCount}
    مستوى الصعوبة: ${difficulty === 'EASY' ? 'سهل' : difficulty === 'MEDIUM' ? 'متوسط' : 'صعب'}
    
    المطلوب:
    1. أنشئ أسئلة متنوعة (اختيار من متعدد + صح وخطأ).
    2. لكل سؤال، وفر 3 أو 4 خيارات إذا كان اختيار من متعدد.
    3. حدد الإجابة الصحيحة بوضوح في نهاية كل سؤال.
    
    التنسيق المطلوب للإجابة:
    - السؤال 1: [نص السؤال]
      أ) [خيار]
      ب) [خيار]
      ج) [خيار]
      (الإجابة الصحيحة: ...)
    
    - السؤال 2: ...
    
    استخدم لغة عربية سليمة وواضحة ومناسبة للفئة العمرية.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في توليد الأسئلة.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- NEW: Remedial Plan Generator ---
export const generateRemedialPlan = async (
    studentName: string,
    gradeLevel: string,
    subject: string,
    weaknessAreas: string
): Promise<string> => {
    const prompt = `
    أنت مستشار تربوي وأكاديمي. قم بوضع "خطة علاجية" (Remedial Plan) للطالب المتعثر دراسياً.
    
    بيانات الطالب:
    - الاسم: ${studentName}
    - الصف: ${gradeLevel}
    - المادة: ${subject}
    - نقاط الضعف الملاحظة / الدرجات المنخفضة في: ${weaknessAreas}
    
    المطلوب:
    أنشئ خطة علاجية عملية ومختصرة تتكون من 4 أقسام رئيسية:
    1. **أهداف الخطة:** (ماذا نريد أن يحقق الطالب؟)
    2. **إجراءات المعلم داخل الفصل:** (استراتيجيات تدريس، تكليفات خاصة).
    3. **مهام الطالب المنزلية:** (تمارين، فيديوهات مقترحة بشكل عام، مراجعة).
    4. **دور ولي الأمر:** (كيف يمكن للأهل المساعدة؟).
    
    اجعل الخطة مشجعة وقابلة للتطبيق في أسبوعين.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في إنشاء الخطة.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};
