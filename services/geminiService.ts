
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

// Helper to attempt repairing truncated JSON
function tryRepairJson(jsonString: string): string {
    let fixed = jsonString.trim();
    
    // 1. Close unclosed string
    let inString = false;
    let escape = false;
    for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '\\') {
            escape = !escape;
        } else {
            if (char === '"' && !escape) {
                inString = !inString;
            }
            escape = false;
        }
    }
    if (inString) fixed += '"';

    // 2. Remove trailing comma if exists (common before closing)
    if (fixed.endsWith(',')) fixed = fixed.slice(0, -1);

    // 3. Balance Brackets/Braces
    let openBraces = 0;
    let openBrackets = 0;
    
    // Recalculate context (simple counter, assuming strings are closed now)
    inString = false;
    escape = false;
    for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '\\') { escape = !escape; continue; }
        if (char === '"' && !escape) { inString = !inString; }
        escape = false;

        if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') openBraces = Math.max(0, openBraces - 1);
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
        }
    }

    // Append missing closures
    while (openBraces > 0) { fixed += '}'; openBraces--; }
    while (openBrackets > 0) { fixed += ']'; openBrackets--; }

    return fixed;
}

// --- NEW: Generate Questions from Slide ---
export const generateSlideQuestions = async (
    contextText: string,
    imageBase64?: string
): Promise<any[]> => {
    const prompt = `
    Act as a teacher in a Saudi School (Curriculum 1447 AH). Based on the provided context (text or image from a presentation slide), generate 3 interactive multiple-choice questions to check students' understanding.
    
    Language: Arabic (Saudi Educational Context 1447).
    Difficulty: Suitable for school students.
    
    Requirements:
    1. Questions should be directly related to the content if provided, otherwise general relevant questions based on the topic.
    2. Provide 3 or 4 options for each question.
    3. Identify the correct answer.
    
    Output Format: JSON Array ONLY.
    Schema:
    [
      {
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C"],
        "correctAnswer": "Option A" 
      }
    ]
    
    Context/Topic: ${contextText || "General Topic"}
    `;

    try {
        const parts: any[] = [{ text: prompt }];
        
        if (imageBase64) {
            // Ensure clean base64 (remove data:image/...,)
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });

        const text = response.text || "[]";
        const cleanText = cleanJsonString(text);
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        return [];
    }
};

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
    قم بتحليل أداء الطالب التالي كمرشد طلابي في مدرسة سعودية (وفق لائحة 1447).
    
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
    2. قيم السلوك والانضباط داخل الفصل.
    3. حلل المستوى الأكاديمي ونقاط القوة والضعف.
    4. قدم نصيحة تربوية محددة وعملية للتحسين.
    
    الأسلوب: مهني، مشجع، ومباشر.
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
    بصفتك معلماً خبيراً لمادة ${subject} في المناهج السعودية (طبعة 1447هـ)، قم بإنشاء اختبار قصير (Quiz) للطلاب في ${gradeLevel || 'المرحلة العامة'}.
    
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
    
    استخدم لغة عربية سليمة ومصطلحات متوافقة مع الكتب المدرسية السعودية الطبعة الجديدة 1447هـ.
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
    أنت خبير تربوي ومختص في صعوبات التعلم. قم بوضع "خطة علاجية" (Remedial Plan) متوافقة مع معايير وزارة التعليم السعودية (1447هـ).
    
    بيانات الطالب:
    - الاسم: ${studentName}
    - الصف: ${gradeLevel}
    - المادة: ${subject}
    - المهارات المفقودة / نقاط الضعف: ${weaknessAreas}
    
    المطلوب:
    أنشئ خطة علاجية عملية ومختصرة بتنسيق Markdown منظم (استخدم القوائم والعناوين العريضة):
    1. **المهارة المستهدفة:** (تحديد نواتج التعلم غير المحققة وفق المنهج الجديد).
    2. **إجراءات المعلم (داخل الفصل):** (استراتيجيات التدريس المتمايز، أوراق عمل، تكليف الأقران).
    3. **مهام الطالب (الواجبات العلاجية):** (تمارين عبر منصة مدرستي، فيديوهات إثرائية من عين).
    4. **دور الأسرة:** (كيف يمكن للأهل المساعدة في المنزل).
    
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

// --- NEW: Lesson Planner (Enhanced for Saudi Curriculum 1447) ---
export const generateLessonPlan = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    duration: string,
    strategies: string[] = [],
    resources: string[] = [],
    objectives: string = ""
): Promise<string> => {
    const prompt = `
    أنت معلم خبير في المناهج السعودية (إصدار 1447هـ). قم بإعداد "تحضير درس" (Lesson Plan) نموذجي ومتكامل يراعي متطلبات "منصة مدرستي" ونظام "نور".
    
    المعلومات الأساسية:
    - المادة: ${subject}
    - موضوع الدرس: ${topic}
    - الصف: ${gradeLevel}
    - الزمن: ${duration} دقيقة
    
    المدخلات الإضافية:
    - استراتيجيات التعلم النشط: ${strategies.join('، ') || 'اختر استراتيجيات مناسبة'}
    - الوسائل ومصادر التعلم: ${resources.join('، ') || 'الكتاب المدرسي، منصة مدرستي، بوابة عين'}
    - الأهداف الخاصة: ${objectives}
    
    المطلوب تحضير مفصل بتنسيق Markdown احترافي (استخدم العناوين الكبيرة # والجداول عند الحاجة):
    
    # تحضير درس: ${topic}
    
    ## 1. الأهداف التعليمية (نواتج التعلم)
    * (أن يكون الطالب قادراً على... - وتشمل أهداف معرفية ومهارية ووجدانية).
    
    ## 2. استراتيجيات التدريس والوسائل
    * **الاستراتيجيات:** ...
    * **الوسائل:** ...
    
    ## 3. إجراءات الدرس (السيناريو المقترح)
    (يرجى وضع هذا القسم في جدول Markdown يحتوي على: التوقيت، النشاط، دور المعلم، دور الطالب)
    
    | التوقيت | النشاط / الخطوة | دور المعلم | دور الطالب |
    |---|---|---|---|
    | 5 د | التهيئة | ... | ... |
    | ... | ... | ... | ... |
    
    ## 4. التقويم (غلق الدرس)
    * أسئلة للتأكد من الفهم.
    
    ## 5. الواجب المنزلي
    * ...
    
    اللغة: عربية فصحى تربوية.
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

// --- NEW: Semester Plan Generator (Saudi 1447 AH) ---
export const generateSemesterPlan = async (
    subject: string,
    gradeLevel: string,
    term: string,
    weeks: number,
    content: string = ""
): Promise<string> => {
    const prompt = `
    أنت خبير مناهج في وزارة التعليم السعودية (إصدار 1447هـ). قم بإعداد "توزيع منهج" (Semester Plan) للمادة المحددة.
    
    المادة: ${subject}
    الصف: ${gradeLevel}
    الفصل الدراسي: ${term} (نظام الفصول الدراسية الثلاثة لعام 1447هـ)
    عدد الأسابيع الدراسية: ${weeks} أسبوعاً
    
    ${content ? `**محتويات المقرر (الوحدات/الدروس) كما قدمها المعلم:**\n${content}\n\nيجب الالتزام بتوزيع هذه المحتويات بدقة على ${weeks} أسبوعاً.` : `**تنبيه:** لم يتم تقديم محتوى محدد، لذا قم باقتراح الوحدات بناءً على أحدث طبعة للكتاب المدرسي لعام 1447هـ وتوزيعها على ${weeks} أسبوعاً.`}
    
    المطلوب:
    أنشئ جدولاً بتنسيق Markdown يوزع وحدات ودروس المادة على ${weeks} أسبوع دراسي.
    
    يجب أن يكون الرد عبارة عن جدول Markdown فقط مع مقدمة بسيطة.
    
    التنسيق المطلوب (جدول Markdown):
    | الأسبوع | الوحدة / المجال | موضوعات الدروس | عدد الحصص | ملاحظات |
    |---|---|---|---|---|
    | الأسبوع 1 | ... | ... | ... | ... |
    ...
    | الأسبوع ${weeks} | مراجعة | اختبارات عملية / تحريرية | - | ... |
    
    تأكد من تغطية كامل المنهج بشكل متوازن خلال المدة المحددة.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في إنشاء الخطة الفصلية.";
    } catch (error) {
        console.error("Semester Plan Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- NEW: Learning Plan Generator (Saudi Standards) ---
export const generateLearningPlan = async (
    subject: string,
    gradeLevel: string,
    goal: string,
    durationWeeks: string
): Promise<string> => {
    const prompt = `
    قم بإعداد "خطة تعلم فردية" (Individual Learning Plan) لطالب في المدرسة السعودية (مناهج 1447هـ).
    
    الهدف من الخطة: ${goal}
    المادة: ${subject}
    الصف: ${gradeLevel}
    المدة: ${durationWeeks} أسابيع
    
    المطلوب:
    خطة تنفيذية بتنسيق جدول Markdown مقسمة أسبوعياً:
    
    | الأسبوع | الهدف الأسبوعي | المحتوى التعليمي (عين/مدرستي) | النشاط المقترح | أسلوب التقييم |
    |---|---|---|---|---|
    | 1 | ... | ... | ... | ... |
    
    اجعل الخطة متوافقة مع مصادر التعلم المتاحة للطالب السعودي.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في إنشاء خطة التعلم.";
    } catch (error) {
        console.error("Learning Plan Error:", error);
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

    const truncatedInput = rawText.slice(0, 6000);

    const prompt = `
    You are a smart data parser. I have unstructured text copied from a file, email, or message.
    Extract the data into a JSON Array based on the target schema.
    
    ${schemaDescription}

    Input Text:
    """
    ${truncatedInput}
    """
    
    Rules:
    1. Ignore headers, footers, or irrelevant text.
    2. Fix Arabic names if they appear reversed or broken.
    3. Return ONLY the JSON array. Do NOT return markdown formatting.
    4. If the list is too long, return the first 50 items.
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
        
        try {
            return JSON.parse(cleanText);
        } catch (jsonError) {
            console.warn("Initial JSON parse failed, attempting repair...", jsonError);
            const repaired = tryRepairJson(cleanText);
            return JSON.parse(repaired);
        }

    } catch (error: any) {
        console.error("AI Parse Error:", error);
        
        if (error instanceof SyntaxError) {
             throw new Error("فشل قراءة البيانات: النص طويل جداً مما أدى إلى انقطاع الاستجابة. حاول تقليل النص (مثلاً 20 سطر في كل مرة).");
        }
        
        throw new Error("فشل تحليل النص. تأكد من أن النص يحتوي على بيانات واضحة.");
    }
};
