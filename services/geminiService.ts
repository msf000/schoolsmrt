
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

// تهيئة العميل عند الحاجة لضمان استخدام أحدث مفتاح API
const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("مفتاح API غير متوفر.");
    return new GoogleGenAI({ apiKey });
};

const getModelConfig = (extraConfig?: any) => {
    const settings = getAISettings();
    return {
        model: settings.modelId || 'gemini-3-flash-preview',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction || "أنت مساعد تعليمي ذكي في نظام مدرسي متطور.",
            ...extraConfig
        }
    };
};

async function withRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>, retries = 2, delay = 2000): Promise<T> {
    try {
        const ai = getAIClient();
        return await operation(ai);
    } catch (error: any) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return withRetry(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

/**
 * تحليل أداء طالب بشكل شامل باللغة العربية
 */
export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل أداء الطالب ${student.name}. 
    عدد أيام الغياب: ${attendance.filter(a => a.status === 'ABSENT').length}. 
    الدرجات الأخيرة: ${JSON.stringify(performance.slice(-10).map(p => ({ title: p.title, score: p.score, max: p.maxScore })))}. 
    اكتب تقريراً تربوياً مختصراً يشمل نقاط القوة والتوصيات للتحسين باللغة العربية.`;

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "لم يتمكن الذكاء الاصطناعي من توليد التقرير حالياً.";
    } catch (e) {
        console.error("AI Analysis Failed:", e);
        return "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.";
    }
};

/**
 * فحص حالة الاتصال بخدمة Gemini
 */
export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { model, config } = getModelConfig();
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: "Hi, reply with OK.", config }), 1); 
        return { success: !!response.text, message: response.text ? "متصل" : "لا يوجد رد" };
    } catch (error: any) {
        return { success: false, message: error.message || "فشل الاتصال" };
    }
};

/**
 * توليد أسئلة اختبار نصية للمعاينة
 */
// Fix: Added missing generateQuiz export for AITools component
export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `بصفتك خبيراً تربوياً، قم بتوليد اختبار ${difficulty} لـ ${grade} حول موضوع ${topic} في مادة ${subject}. 
    يجب أن يتضمن الاختبار ${count} أسئلة اختيار من متعدد مع الخيارات الأربعة لكل سؤال وتوضيح الإجابة الصحيحة في النهاية.
    استخدم اللغة العربية الفصحى.`;

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "لم يتمكن الذكاء الاصطناعي من توليد الاختبار حالياً.";
    } catch (e) {
        console.error("Quiz Text Generation Failed:", e);
        return "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.";
    }
};

/**
 * توليد أسئلة اختبار بناءً على موضوع معين
 */
export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate a ${difficulty} quiz for ${grade} about ${topic} in ${subject}. 
    Include ${count} multiple choice questions. 
    Return as a JSON array where each object has: question, options (array of 4 strings), and correctAnswer (one of the options). 
    Use Arabic language for all content.`;

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Quiz Generation Failed:", e);
        return [];
    }
};

/**
 * تصحيح ورقة اختبار من صورة
 */
export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    
    const prompt = `Grade this student exam paper against the provided key. 
    Exam Title: ${exam.title}
    Key: ${JSON.stringify(exam.questions.map(q => ({ id: q.id, answer: q.correctAnswer, points: q.points })))}
    
    Return a JSON object with: 
    - studentNameDetected (string)
    - totalScore (number)
    - maxTotalScore (number)
    - questions (array of objects: { index, questionText, studentAnswer, isCorrect, score, feedback })`;

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            },
            config
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Auto Grading Failed:", e);
        throw new Error("فشل تحليل صورة ورقة الاختبار.");
    }
};

/**
 * توليد ملخص يومي للمعلم (Briefing)
 */
export const generateDailyBriefing = async (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const today = new Date().toISOString().split('T')[0];
    
    const context = {
        totalStudents: students.length,
        absentToday: attendance.filter(a => a.date === today && a.status === 'ABSENT').length,
        lowGradesCount: performance.filter(p => (p.score / (p.maxScore || 10)) < 0.6).length,
    };

    const prompt = `أنت مساعد تعليمي. بناءً على ملخص اليوم: ${JSON.stringify(context)}. 
    اكتب ملخصاً ذكياً وقصيراً جداً (3 نقاط) للمعلم يوضح أهم المهام أو الملاحظات التي يجب التركيز عليها اليوم. استخدم الإيموجي.`;

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "جاهز لبدء يوم دراسي جديد! 🚀";
    } catch (e) {
        return "بالتوفيق في يومك الدراسي اليوم! ركز على تحفيز الطلاب ومتابعة الغائبين. ✨";
    }
};

/**
 * وظائف أخرى (خطط علاجية، تحضير، صياغة رسائل)
 */
export const generateRemedialPlan = async (name: string, grade: string, subject: string, weakness: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صمم خطة علاجية للطالب ${name} في مادة ${subject} (الصف ${grade}). المشكلة: ${weakness}. بالعربية وبنقاط واضحة.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "فشل إنشاء الخطة.";
    } catch (e) { return "الخدمة غير متوفرة."; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أعد تحضير درس نموذجي (Lesson Plan) لموضوع ${topic} في مادة ${subject} للصف ${grade}. المدة: ${duration} دقيقة. بالعربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "فشل التحضير.";
    } catch (e) { return "الخدمة غير متوفرة."; }
};

export const generateParentMessage = async (name: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صغ رسالة لولي أمر الطالب ${name} حول ${topic}. الأسلوب: ${tone}. بالعربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateLessonBlocks = async (subject: string, topic: string, gradeLevel: string, settings: any): Promise<LessonBlock[]> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate lesson blocks for ${topic} (${subject}, ${gradeLevel}) in JSON format. Blocks should have id, type, title, and content. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const parseRawDataWithAI = async (text: string, type: string, img?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Parse this ${type} data into a JSON array of objects. Use proper field names. Source text: ${text}`;
    
    let contents: any = { text: prompt };
    if (img) {
        contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img } },
                { text: prompt }
            ]
        };
    }

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate a full curriculum map for ${subject}, grade ${grade}, for ${term}. Return JSON. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateSlideQuestions = async (context: string, img?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate 3 MCQ questions based on this slide context: ${context}. JSON format.`;
    
    let contents: any = { text: prompt };
    if (img) contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img } }, { text: prompt }] };

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string, type: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Suggest a 5-minute quick classroom activity for topic: ${topic}. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]): Promise<Record<string, string>> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Match headers ${headers.join(', ')} to target fields ${JSON.stringify(targetFields)}. Return JSON map.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};
