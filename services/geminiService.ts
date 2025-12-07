
import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from "../types";
import { getAISettings } from "./storageService";

// Initialize with ENV key - but config can be dynamic
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to get current config
const getConfig = () => {
    const settings = getAISettings();
    return {
        model: settings.modelId || 'gemini-2.5-flash',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction
        },
        enabled: {
            quiz: settings.enableQuiz !== false,
            reports: settings.enableReports !== false,
            planning: settings.enablePlanning !== false
        }
    };
};

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

// --- NEW: Generate Parent Message ---
export const generateParentMessage = async (
    studentName: string,
    topic: string, // e.g., "تأخر متكرر", "انخفاض درجات"
    tone: 'OFFICIAL' | 'FRIENDLY' | 'URGENT'
): Promise<string> => {
    const { model, config } = getConfig();
    
    const toneDesc = tone === 'OFFICIAL' ? 'رسمية ومهنية' : tone === 'FRIENDLY' ? 'ودية ومشجعة' : 'حازمة وعاجلة';
    
    const prompt = `
    بصفتك مساعداً إدارياً في المدرسة، قم بصياغة رسالة قصيرة (SMS/WhatsApp) لولي أمر الطالب "${studentName}".
    
    الموضوع: ${topic}
    النبرة المطلوبة: ${toneDesc}
    
    المتطلبات:
    1. الرسالة يجب أن تكون جاهزة للإرسال فوراً (بدون مقدمات مثل "إليك الرسالة").
    2. استخدم المتغيرات {اسم_الطالب} في النص إذا لزم الأمر، لكن يفضل ذكر الاسم مباشرة.
    3. الاختصار والوضوح (لا تتجاوز 3 أسطر).
    4. التزم بـ "شخصية النظام" المحددة مسبقاً في التعليمات (System Instruction).
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.7,
                systemInstruction: config.systemInstruction // Inherit global persona
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Message Gen Error:", error);
        return "عذراً، تعذر صياغة الرسالة آلياً.";
    }
};

// --- NEW: Organize Raw Content ---
export const organizeCourseContent = async (
    rawText: string,
    subject: string,
    grade: string
): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return rawText; // Return raw if AI disabled

    const prompt = `
    أنت مساعد خبير في تنظيم المناهج الدراسية.
    لديك نص غير منظم يمثل فهرس أو محتويات مادة "${subject}" للصف "${grade}".
    
    المطلوب:
    إعادة صياغة وتنظيم هذا النص في هيكلية واضحة ومرتبة بتنسيق Markdown.
    
    القواعد:
    1. استخدم العناوين (###) للوحدات الدراسية.
    2. استخدم القوائم النقطية (-) للدروس.
    3. صحح الأخطاء الإملائية البسيطة إن وجدت.
    4. حافظ على جميع المعلومات الواردة في النص الأصلي.
    
    النص الأصلي:
    """
    ${rawText}
    """
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.3, // Low temp for formatting
                systemInstruction: config.systemInstruction
            }
        });
        return response.text || rawText;
    } catch (error) {
        console.error("Organize Content Error:", error);
        return rawText; // Fallback
    }
};

// --- NEW: Generate Questions from Slide ---
export const generateSlideQuestions = async (
    contextText: string,
    imageBase64?: string
): Promise<any[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) return [];

    const prompt = `
    Based on the provided context (text or image from a presentation slide), generate 3 interactive multiple-choice questions to check students' understanding.
    
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
            model: model,
            contents: { parts },
            config: { 
                responseMimeType: "application/json",
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
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
  const { model, config, enabled } = getConfig();
  if (!enabled.reports) return "التحليل الذكي معطل من قبل مدير النظام.";

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
    قم بتحليل أداء الطالب التالي كمرشد طلابي.
    
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
      model: model,
      contents: prompt,
      config: {
          temperature: config.temperature,
          systemInstruction: config.systemInstruction
      }
    });
    return response.text || "لم يتم إنشاء تحليل.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "عذراً، حدث خطأ أثناء تحليل البيانات بواسطة الذكاء الاصطناعي.";
  }
};

// --- Quiz Generator (Legacy String) ---
export const generateQuiz = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    questionCount: number = 5,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) return "خدمة إنشاء الاختبارات معطلة.";

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
            model: model,
            contents: prompt,
            config: {
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
        });
        return response.text || "فشل في توليد الأسئلة.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- NEW: Generate Structured Quiz (JSON) for Exam Manager ---
export const generateStructuredQuiz = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    questionCount: number = 5,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
): Promise<any[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) throw new Error("خدمة إنشاء الاختبارات معطلة.");

    const prompt = `
    Generate a structured quiz for the Exam System.
    Subject: ${subject}
    Topic: ${topic}
    Grade: ${gradeLevel}
    Count: ${questionCount}
    Difficulty: ${difficulty}
    
    Output Format: JSON Array ONLY.
    Schema:
    [
        {
            "text": "Question Text",
            "type": "MCQ" | "TRUE_FALSE",
            "options": ["Opt1", "Opt2", "Opt3", "Opt4"], // If TF, use ["صح", "خطأ"]
            "correctAnswer": "Opt1",
            "points": 1
        }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
        });
        const text = response.text || "[]";
        return JSON.parse(cleanJsonString(text));
    } catch (error) {
        console.error("Structured Quiz Error:", error);
        return [];
    }
};

// --- Remedial Plan Generator ---
export const generateRemedialPlan = async (
    studentName: string,
    gradeLevel: string,
    subject: string,
    weaknessAreas: string
): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "الخطط العلاجية معطلة.";

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
            model: model,
            contents: prompt,
            config: {
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
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
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "خدمة تحضير الدروس معطلة.";

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
    (تنبيه: لا تستخدم وسوم HTML مثل <br> داخل الجدول، استخدم تنسيق القائمة النقطية (-) أو فواصل عادية)
    
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
            model: model,
            contents: prompt,
            config: {
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
        });
        return response.text || "فشل في إنشاء التحضير.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- NEW: Syllabus Suggestion (Chapters/Topics) ---
export const suggestSyllabus = async (
    subject: string,
    gradeLevel: string
): Promise<string> => {
    const { model, config } = getConfig();
    const prompt = `
    بصفتك خبيراً في المناهج الدراسية السعودية لعام 1447هـ، قم بسرد قائمة الفصول والمواضيع الرئيسية لمادة "${subject}" للصف "${gradeLevel}".
    
    المطلوب:
    قائمة نقطية بسيطة وواضحة (بدون مقدمات أو جداول معقدة) تحتوي على:
    - أسماء الوحدات / الفصول.
    - تحت كل فصل، أبرز 3-4 دروس.
    
    مثال للتنسيق:
    الفصل الأول: [اسم الفصل]
    - الدرس 1
    - الدرس 2
    
    الدقة مهمة جداً ومطابقة للكتاب المدرسي الرسمي لطبعة 1446-1447هـ.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { temperature: config.temperature }
        });
        return response.text || "";
    } catch (error) {
        console.error("Syllabus Error:", error);
        return "فشل في جلب المواضيع.";
    }
};

// --- NEW: Semester Plan Generator (Saudi 1447 AH) ---
export const generateSemesterPlan = async (
    subject: string,
    gradeLevel: string,
    term: string,
    weeks: number,
    classesPerWeek: number,
    content: string = ""
): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "الخطط الفصلية معطلة.";

    const prompt = `
    أنت خبير مناهج في وزارة التعليم السعودية (إصدار 1447هـ). قم بإعداد "توزيع منهج" (Semester Plan) للمادة المحددة.
    
    المادة: ${subject}
    الصف: ${gradeLevel}
    الفصل الدراسي: ${term} (نظام الفصول الدراسية الثلاثة لعام 1447هـ)
    عدد الأسابيع الدراسية: ${weeks} أسبوعاً
    عدد الحصص الأسبوعية: ${classesPerWeek} حصص
    
    ${content ? `**محتويات المقرر (الوحدات/الدروس) كما قدمها المعلم:**\n${content}\n\nيجب الالتزام بتوزيع هذه المحتويات بدقة على ${weeks} أسبوعاً.` : `**تنبيه:** لم يتم تقديم محتوى محدد، لذا قم باقتراح الوحدات بناءً على أحدث طبعة للكتاب المدرسي لعام 1447هـ وتوزيعها على ${weeks} أسبوعاً.`}
    
    المطلوب:
    أنشئ جدولاً بتنسيق Markdown يوزع وحدات ودروس المادة على ${weeks} أسبوع دراسي.
    (تنبيه: لا تستخدم وسوم HTML داخل الجدول، ولا تكتب مقدمات طويلة مثل "بصفتي خبيراً...". ابدأ بالجدول مباشرة أو مقدمة قصيرة جداً).
    
    التنسيق المطلوب (جدول Markdown) بدقة، مع التأكد من تعبئة عمود "عدد الحصص":
    | الأسبوع | الوحدة / المجال | موضوعات الدروس | عدد الحصص (تقريبي) | ملاحظات |
    |---|---|---|---|---|
    | الأسبوع 1 | ... | ... | ${classesPerWeek} حصص | ... |
    ...
    | الأسبوع ${weeks} | مراجعة | اختبارات عملية / تحريرية | - | ... |
    
    تأكد من تغطية كامل المنهج بشكل متوازن خلال المدة المحددة.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
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
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "خطط التعلم معطلة.";

    const prompt = `
    قم بإعداد "خطة تعلم فردية" (Individual Learning Plan) لطالب في المدرسة السعودية (مناهج 1447هـ).
    
    الهدف من الخطة: ${goal}
    المادة: ${subject}
    الصف: ${gradeLevel}
    المدة: ${durationWeeks} أسابيع
    
    المطلوب:
    خطة تنفيذية بتنسيق جدول Markdown مقسمة أسبوعياً (بدون استخدام HTML tags):
    
    | الأسبوع | الهدف الأسبوعي | المحتوى التعليمي (عين/مدرستي) | النشاط المقترح | أسلوب التقييم |
    |---|---|---|---|---|
    | 1 | ... | ... | ... | ... |
    
    اجعل الخطة متوافقة مع مصادر التعلم المتاحة للطالب السعودي.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
        });
        return response.text || "فشل في إنشاء خطة التعلم.";
    } catch (error) {
        console.error("Learning Plan Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- NEW: Learning Outcomes Map Generator (Saudi 1447) ---
export const generateLearningOutcomesMap = async (
    subject: string,
    gradeLevel: string,
    content: string = ""
): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "خرائط النواتج معطلة.";

    const prompt = `
    بصفتك خبيراً في المناهج وطرق التدريس (المملكة العربية السعودية 1447هـ)، قم ببناء "خريطة نواتج التعلم" (Learning Outcomes Map) للمادة المحددة.
    
    المادة: ${subject}
    الصف: ${gradeLevel}
    ${content ? `محتوى الوحدات/الدروس والمواضيع: ${content}` : ''}
    
    المطلوب:
    إنشاء مصفوفة (جدول Markdown) تربط بين الوحدات الدراسية ونواتج التعلم الثلاثة (المعرفية، المهارية، الوجدانية) وأساليب التقويم.
    
    التنسيق المطلوب (جدول Markdown):
    | الوحدة / الدرس | النواتج المعرفية (Knowledge) | النواتج المهارية (Skills) | النواتج الوجدانية (Values) | أساليب التقويم المقترحة |
    |---|---|---|---|---|
    | ... | ... | ... | ... | ... |
    
    القواعد:
    1. استخدم أفعالاً سلوكية قابلة للقياس (يعدد، يشرح، يطبق، يحلل، يقدر...).
    2. تأكد من شمولية النواتج للمجالات الثلاثة.
    3. اقترح أساليب تقويم متنوعة (اختبار قصير، ملاحظة، مشروع، ملف إنجاز).
    4. لا تكتب مقدمات طويلة، ابدأ بالجدول مباشرة.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: config.temperature,
                systemInstruction: config.systemInstruction
            }
        });
        return response.text || "فشل في إنشاء خريطة نواتج التعلم.";
    } catch (error) {
        console.error("Outcomes Map Error:", error);
        return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

// --- Smart Column Mapper (AI Import) ---
export const predictColumnMapping = async (
    headers: string[],
    targetFields: { key: string; label: string }[],
    sampleData: any[]
): Promise<Record<string, string>> => {
    const { model, config } = getConfig();
    
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
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: config.temperature
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

// --- NEW: Parse Unstructured Text Data (Multimodal supported) ---
export const parseRawDataWithAI = async (
    rawText: string,
    targetType: 'STUDENTS' | 'GRADES' | 'ATTENDANCE',
    imageBase64?: string
): Promise<any[]> => {
    const { model, config } = getConfig();
    
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
            "studentName": "Student Name (Arabic)",
            "nationalId": "10-digit National ID if visible/found, else null",
            "status": "PRESENT" | "ABSENT" | "LATE",
            "date": "YYYY-MM-DD" (use today if not specified),
            "subject": "Subject Name if visible/context implies it, else null",
            "period": "Period Number if visible (e.g. 1 for First Period), else null"
        }]
        `;
    }

    const truncatedInput = rawText.slice(0, 6000);

    const prompt = `
    You are a smart data parser. I have unstructured data (text or an image of a table/list).
    Extract the data into a JSON Array based on the target schema.
    
    ${schemaDescription}

    Input Text (if any):
    """
    ${truncatedInput}
    """
    
    Rules:
    1. Ignore headers, footers, or irrelevant text.
    2. Fix Arabic names if they appear reversed or broken.
    3. Return ONLY the JSON array. Do NOT return markdown formatting.
    4. If the list is too long, return the first 50 items.
    5. If an image is provided, extract data using OCR.
    6. For Attendance, try to infer the Period or Subject if the text mentions it (e.g. "Third Period", "Math Class").
    `;

    try {
        const parts: any[] = [{ text: prompt }];
        
        if (imageBase64) {
            // Remove prefix if present
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                temperature: config.temperature
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
