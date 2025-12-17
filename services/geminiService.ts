
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

// Fix: Guidelines state to Always use new instance before making an API call and use named parameter
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
            systemInstruction: settings.systemInstruction,
            ...extraConfig
        }
    };
};

async function withRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>, retries = 3, delay = 2000): Promise<T> {
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

export const generateDailyBriefing = async (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const today = new Date().toISOString().split('T')[0];
    const context = {
        totalStudents: students.length,
        absentToday: attendance.filter(a => a.date === today && a.status === 'ABSENT').length,
        recentLowGrades: performance.filter(p => (p.score / p.maxScore) < 0.6).length,
        topPerformers: performance.filter(p => (p.score / p.maxScore) > 0.9).slice(0, 3).map(p => students.find(s => s.id === p.studentId)?.name)
    };
    const prompt = `أنت مساعد تعليمي ذكي للمعلم. بناءً على البيانات التالية: ${JSON.stringify(context)}. 
    اكتب ملخصاً قصيراً جداً (3 نقاط) للمهام التي يجب على المعلم التركيز عليها اليوم. 
    اجعل الأسلوب تشجيعياً ومهنياً باللغة العربية. استخدم الإيموجي.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "جاهز لبدء يوم دراسي جديد! 🚀";
    } catch (e) { return "ركز اليوم على تشجيع الطلاب ومتابعة الغائبين. بالتوفيق! ✨"; }
};

export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { model, config } = getModelConfig();
        await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: "Test connection. Reply with 'OK'.", config }), 1); 
        return { success: true, message: "تم الاتصال بنجاح!" };
    } catch (error: any) { return { success: false, message: error.message || "فشل الاتصال." }; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل أداء الطالب ${student.name}. غياب: ${attendance.filter(a=>a.status==='ABSENT').length}. درجات: ${performance.slice(-5).map(p=>p.score)}. اكتب تقريراً تربوياً مختصراً باللغة العربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "لا يمكن تحليل البيانات حالياً.";
    } catch (e) { return "خدمة التحليل غير متوفرة."; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    try {
        const prompt = `Create a ${difficulty} quiz for ${grade} about ${topic} in ${subject}. ${count} questions. Use Arabic language.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, weakness: string) => {
    const { model, config } = getModelConfig();
    try {
        const prompt = `Create remedial plan: ${name} (${grade}), ${subject}, Weakness: ${weakness}. Arabic.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return "فشل إنشاء الخطة."; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    try {
        const prompt = `Full lesson plan: ${topic} (${subject}, ${grade}), ${duration} mins. Arabic.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return "فشل التحضير."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    try {
        const prompt = `Parent message for ${studentName} about ${topic}. Tone: ${tone}. Arabic language.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return "فشل صياغة الرسالة."; }
};

export const generateLessonBlocks = async (subject: string, topic: string, gradeLevel: string, settings: any): Promise<LessonBlock[]> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate lesson blocks for ${topic} (${subject}, ${gradeLevel}) in JSON format. Blocks should have id, type, title, and content.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const prompt = `Grade this exam paper: ${JSON.stringify(exam)}. Return JSON format with totalScore, maxTotalScore, and questions results.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: prompt }] },
            config
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { throw new Error("فشل تحليل الصورة وتصحيحها."); }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sample: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Map headers ${headers} to target fields ${JSON.stringify(targetFields)}. JSON output.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const parseRawDataWithAI = async (text: string, type: string, img?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Parse this ${type} data into a JSON array: ${text}`;
    
    // Fix: Support multimodal content if image is provided
    const contents: any = img 
        ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img } }, { text: prompt }] }
        : { parts: [{ text: prompt }] };

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateStructuredQuiz = async (sub: string, topic: string, grade: string, count: number, diff: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate ${count} ${diff} quiz questions for ${sub} about ${topic} in ${grade}. Return JSON array of objects with question, options, and correctAnswer. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate curriculum map for ${subject} ${grade} ${term}. Return JSON format.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateSlideQuestions = async (context: string, img?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate multiple choice questions based on the provided context: ${context}. Return as JSON array of objects.`;
    
    // Fix: Support multimodal content if image is provided
    const contents: any = img 
        ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img } }, { text: prompt }] }
        : { parts: [{ text: prompt }] };

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string, type: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Suggest a quick classroom activity for ${topic}. Type: ${type}. Arabic language.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};
