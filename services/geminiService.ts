
import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON string from Markdown
function cleanJsonString(text: string): string {
    if (!text) return "[]";
    // Remove markdown code blocks ```json ... ``` or ``` ... ```
    let clean = text.replace(/```json/gi, '').replace(/```/g, '');
    return clean.trim();
}

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

// --- Quiz Generator ---
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

// --- Remedial Plan Generator ---
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

// --- NEW: Lesson Planner ---
export const generateLessonPlan = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    duration: string
): Promise<string> => {
    const prompt = `
    أنت خبير تربوي. قم بإعداد "تحضير درس" (Lesson Plan) نموذجي ومحترف.
    
    المعلومات الأساسية:
    - المادة: ${subject}
    - موضوع الدرس: ${topic}
    - الصف: ${gradeLevel}
    - مدة الحصة: ${duration} دقيقة
    
    المطلوب:
    أنشئ تحضيراً مرتباً يحتوي على الأقسام التالية بوضوح:
    
    1. **الأهداف السلوكية/التعليمية:** (أن يكون الطالب قادراً على...)
    2. **الوسائل التعليمية:** (ماذا يحتاج المعلم؟)
    3. **التهيئة (Introduction):** (كيف ستبدأ الدرس لجذب الانتباه؟)
    4. **إجراءات التدريس والأنشطة:** (خطوات شرح الدرس مقسمة زمنياً بشكل تقريبي)
    5. **التقويم المرحلي والختامي:** (كيف تتأكد من الفهم؟)
    6. **الواجب المنزلي المقترح.**
    
    اللغة: عربية فصحى تربوية سليمة.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في إنشاء التحضير.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- Smart Column Mapper (AI Import) ---
export const predictColumnMapping = async (
    headers: string[],
    targetFields: { key: string; label: string }[],
    sampleData: any[]
): Promise<Record<string, string>> => {
    const prompt = `
    Act as a data processing expert. I have an Excel file uploaded by a teacher with these Headers:
    ${JSON.stringify(headers)}

    And here is a sample of the first row of data to understand context:
    ${JSON.stringify(sampleData)}

    I need to map these headers to my system's internal database fields.
    The available target fields in my system are:
    ${JSON.stringify(targetFields.map(f => `${f.key} (${f.label})`))}

    Task:
    Return a JSON object where the keys are my system's target fields (e.g., 'name', 'nationalId') and the values are the exact matching Header string from the uploaded file.
    
    Rules:
    1. Only include fields where you are confident of a match.
    2. 'nationalId' usually refers to National ID, Identity, Iqama, Sivil Record, الهوية, السجل المدني.
    3. 'name' refers to Student Name, الاسم, اسم الطالب.
    4. 'phone' refers to Mobile, Phone, الجوال, الهاتف.
    5. Ignore unmapped fields.
    6. Return ONLY the JSON object, no code blocks or extra text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text || "{}";
        const jsonStr = cleanJsonString(text);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Mapping Error:", error);
        return {};
    }
};

// --- NEW: Parse Unstructured Text Data ---
export const parseRawDataWithAI = async (
    rawText: string,
    targetType: 'STUDENTS' | 'GRADES' | 'ATTENDANCE'
): Promise<any[]> => {
    let schemaDescription = "";
    if (targetType === 'STUDENTS') {
        schemaDescription = `
        Target Schema:
        [{
            "name": "Student Name (Arabic)",
            "nationalId": "10-digit ID if found, else null",
            "gradeLevel": "Grade/Class Name",
            "phone": "Phone number if found",
            "email": "Email if found"
        }]
        `;
    } else if (targetType === 'GRADES') {
        schemaDescription = `
        Target Schema:
        [{
            "studentName": "Student Name",
            "subject": "Subject Name",
            "title": "Exam/Activity Title",
            "score": number (the grade),
            "maxScore": number (total possible grade, default 10 or 20 if not specified)
        }]
        `;
    } else if (targetType === 'ATTENDANCE') {
        schemaDescription = `
        Target Schema:
        [{
            "studentName": "Student Name",
            "status": "PRESENT" | "ABSENT" | "LATE",
            "date": "YYYY-MM-DD" (use today if not specified)
        }]
        `;
    }

    const prompt = `
    You are a smart data parser. I have unstructured text copied from a file, email, or message.
    Extract the data into a JSON Array based on the target schema.
    
    ${schemaDescription}

    Input Text:
    """
    ${rawText.slice(0, 20000)} 
    """
    
    Rules:
    1. Ignore headers, footers, or irrelevant text.
    2. Fix Arabic names if they appear reversed or broken.
    3. Return ONLY the JSON array. Do NOT return markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        const text = response.text || "[]";
        const cleanText = cleanJsonString(text);
        return JSON.parse(cleanText);
    } catch (error: any) {
        console.error("AI Parse Error:", error);
        
        // Handle JSON Parse Errors (often due to truncation)
        if (error instanceof SyntaxError) {
             throw new Error("فشل قراءة البيانات: قد يكون النص طويلاً جداً مما أدى إلى انقطاع الاستجابة (Truncation). حاول تقليل كمية النص المدخل.");
        }
        
        throw new Error("فشل تحليل النص. تأكد من أن النص يحتوي على بيانات واضحة.");
    }
};
