
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, LessonBlock, Exam, Question } from "../types";
import { getAISettings } from "./storageService";

// تهيئة عميل AI
const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("مفتاح API غير متوفر.");
    return new GoogleGenAI({ apiKey });
};

const getModelConfig = (extraConfig?: any) => {
    const settings = getAISettings();
    return {
        model: 'gemini-3-flash-preview',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction || "أنت خبير تربوي ومحلل بيانات تعليمية. لغتك عربية فصيحة وتربوية.",
            ...extraConfig
        }
    };
};

export const checkAIConnection = async () => {
    try {
        const ai = getAIClient();
        await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping' });
        return { success: true, message: "متصل بـ Gemini بنجاح" };
    } catch (e: any) {
        return { success: false, message: e.message || "فشل الاتصال" };
    }
};

export const analyzeMicrosoftFormsData = async (rawData: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    حلل بيانات ملف Excel التالي المصدر من Microsoft Forms:
    "${rawData}"
    
    المطلوب:
    1. استخراج قائمة الطلاب ودرجاتهم.
    2. تحديد الأسئلة التي واجه فيها معظم الطلاب صعوبة.
    3. تقديم توصية تربوية للمعلم لتحسين النتائج.
    
    أرجع النتيجة بتنسيق JSON:
    {
      "results": [{"studentName": "...", "score": 10, "total": 15}],
      "analysis": "...",
      "difficultQuestions": ["..."],
      "recommendations": "..."
    }
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const diagnoseLearningStyle = async (studentName: string, observations: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    بناءً على الملاحظات التالية للطالب ${studentName}: "${observations}".
    حدد نمط التعلم الأنسب له وفق نموذج VARK (بصري، سمعي، قرائي، حركي).
    
    أرجع JSON: {"style": "VISUAL|AUDITORY|READ_WRITE|KINESTHETIC", "reasoning": "...", "tips": "..."}
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `
    قم بتحليل أداء الطالب التالي:
    الاسم: ${student.name}
    الحضور: ${JSON.stringify(attendance)}
    الدرجات: ${JSON.stringify(performance)}
    
    قدم تقريراً تربوياً شاملاً يشمل نقاط القوة، نقاط الضعف، وتوصيات محددة. استخدم لغة عربية تربوية.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return "عذراً، فشل تحليل البيانات."; }
};

export const chatWithData = async (query: string, context: { students: any[], attendance: any[], performance: any[] }) => {
    const { model, config } = getModelConfig();
    const prompt = `
    سؤال المعلم: "${query}"
    بيانات الطلاب المتاحة: ${JSON.stringify(context.students.slice(0, 20))} ...
    ملخص الحضور والدرجات متاح لك. أجب باختصار وذكاء.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "لا يوجد رد.";
    } catch (e) { return "خطأ في الاتصال بالذكاء الاصطناعي."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صغ رسالة لولي أمر الطالب ${studentName} بخصوص ${topic}. النبرة المطلوبة: ${tone}. الرسالة باللغة العربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صمم خطة علاجية للطالب ${name} في الصف ${grade} لمادة ${subject} في موضوع ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `قم بتحضير درس ${subject} بعنوان ${topic} للصف ${grade}. المدة ${duration} دقيقة.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنشئ اختباراً في ${subject} موضوعه ${topic} لطلاب ${grade}. العدد ${count} أسئلة، الصعوبة ${difficulty}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `أنشئ اختباراً MCQ في ${subject} - ${topic} لطلاب ${grade}. العدد ${count}، الصعوبة ${difficulty}.
    JSON: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, grade: string, options: any) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `قسم تحضير درس ${topic} لمادة ${subject} صف ${grade} إلى كتل تعليمية. 
    JSON: [{"id": "1", "type": "CONTENT|ACTIVITY|ASSESSMENT", "title": "...", "content": "..."}]`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const ai = getAIClient();
    const textPart = { text: `استخرج البيانات من هذا النص/الصورة وصنفها كـ ${type}. JSON فقط.` };
    const parts: any[] = [textPart];
    
    if (text) parts.push({ text });
    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: imageBase64.split(',')[1],
            },
        });
    }

    try {
        const response = await ai.models.generateContent({ model, contents: { parts }, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `طابق هذه الأعمدة ${JSON.stringify(headers)} مع الحقول المطلوبة ${JSON.stringify(targetFields)}. JSON: {"targetField": "excelColumnName"}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const ai = getAIClient();
    const prompt = `صحح ورقة الطالب هذه بناءً على الاختبار: ${JSON.stringify(exam)}. 
    JSON: {"studentNameDetected": "...", "totalScore": 5, "maxTotalScore": 10, "questions": [{"index": 1, "isCorrect": true, "studentAnswer": "..."}]}`;
    
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64.split(',')[1],
        },
    };

    try {
        const response = await ai.models.generateContent({ model, contents: { parts: [imagePart, { text: prompt }] }, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `وزع منهج ${subject} لطلاب ${grade} في ${term} السعودي. 
    JSON: [{"unitTitle": "...", "lessons": [{"title": "..."}]}]`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateDailyBriefing = async (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `أعطني موجزاً ذكياً للمعلم اليوم بناءً على بيانات ${students.length} طالب وحضورهم ودرجاتهم. كن ملهماً وعملياً.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "أهلاً بك! ركز اليوم على تحفيز الطلاب.";
    } catch (e) { return "أهلاً بك! ركز اليوم على تحفيز الطلاب."; }
};

export const suggestSeatingPlan = async (students: any[], criterion: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `اقترح توزيع مقاعد لطلاب الفصل بناءً على: ${criterion}. البيانات: ${JSON.stringify(students.slice(0, 30))}.
    JSON: {"reasoning": "...", "seating": [{"studentId": "...", "row": 0, "col": 0}]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const playTextAsSpeech = async (text: string) => { return true; };
export const generateSlideQuestions = async (context: string) => { return []; };
export const suggestQuickActivity = async (topic: string) => { return ""; };
