
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

const getConfig = () => {
    const settings = getAISettings();
    return {
        model: settings.modelId || 'gemini-3-flash-preview',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction
        }
    };
};

let aiInstance: GoogleGenAI | null = null;
const getAIClient = () => {
    if (aiInstance) return aiInstance;
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) throw new Error("مفتاح API غير متوفر.");
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
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
    const { model } = getConfig();
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
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model,
            contents: prompt
        }));
        return response.text || "جاهز لبدء يوم دراسي جديد! 🚀";
    } catch (e) {
        return "ركز اليوم على تشجيع الطلاب ومتابعة الغائبين. بالتوفيق! ✨";
    }
};

// ... (Rest of existing geminiService functions remain same)
export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { model } = getConfig();
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model,
            contents: "Test connection. Reply with 'OK'.",
        }), 1); 
        if (response.text) return { success: true, message: "تم الاتصال بنجاح!" };
        return { success: false, message: "لم يتم استلام رد من النموذج." };
    } catch (error: any) {
        return { success: false, message: error.message || "فشل الاتصال." };
    }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model } = getConfig();
    const prompt = `حلل أداء الطالب ${student.name}. عدد أيام الغياب: ${attendance.filter(a=>a.status==='ABSENT').length}. متوسط درجاته: ${performance.length > 0 ? performance.reduce((a,b)=>a+(b.score/b.maxScore),0)/performance.length : 'لا يوجد'}. اكتب تقريراً تربوياً مختصراً.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "لا يمكن تحليل البيانات حالياً.";
    } catch (e) { return "خدمة التحليل غير متوفرة."; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
     const { model } = getConfig();
     try {
        const prompt = `Create a ${difficulty} quiz for ${grade} about ${topic} in ${subject}. ${count} questions. JSON format.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "";
     } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, weakness: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Create remedial plan: ${name} (${grade}), ${subject}, Weakness: ${weakness}. Arabic.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "";
    } catch (e) { return "فشل إنشاء الخطة."; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Full lesson plan: ${topic} (${subject}, ${grade}), ${duration} mins. Arabic.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "";
    } catch (e) { return "فشل التحضير."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Parent message for ${studentName} about ${topic}. Tone: ${tone}. Arabic.`;
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "";
    } catch (e) { return "فشل صياغة الرسالة."; }
};

export const generateLessonBlocks = async (subject: string, topic: string, gradeLevel: string, settings: any): Promise<LessonBlock[]> => {
    const { model } = getConfig();
    const prompt = `Generate lesson blocks for ${topic} (${subject}, ${gradeLevel}) in JSON format.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const regenerateSingleBlock = async (type: string, title: string, context: any): Promise<string> => {
    const { model } = getConfig();
    const prompt = `Regenerate ${type} content for ${title} in the context of ${JSON.stringify(context)}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model } = getConfig();
    const prompt = `Generate a curriculum map for ${subject} grade ${grade} for ${term} as a JSON list of units and lessons.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateSlideQuestions = async (context: string, img?: string) => {
    const { model } = getConfig();
    const prompt = `Generate 2 MCQs for slides based on this context: ${context}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string, type: string) => {
    const { model } = getConfig();
    const prompt = `Suggest a quick classroom activity for ${topic} of type ${type}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model: model, contents: prompt }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const parseRawDataWithAI = async (text: string, type: string, img?: string) => {
    const { model } = getConfig();
    const prompt = `Parse this raw ${type} data into a JSON array: ${text}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sample: any[]) => {
    const { model } = getConfig();
    const prompt = `Map these headers ${headers} to target fields ${JSON.stringify(targetFields)} based on sample row ${JSON.stringify(sample)}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const generateStructuredQuiz = async (sub: string, topic: string, grade: string, count: number, diff: string) => {
    const { model } = getConfig();
    const prompt = `Generate a structured quiz for ${sub}, ${topic}, ${grade} with ${count} questions at ${diff} difficulty. JSON output.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

// Fix: Added gradeExamPaper function for automated exam grading from images
export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model } = getConfig();
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    
    const prompt = `Grade this student's exam paper based on the following exam structure and correct answers:
    ${JSON.stringify(exam)}
    
    Please detect the student's name if written on the paper. 
    Compare the student's answers to the correct answers.
    Return the result in the following JSON format:
    {
      "studentNameDetected": "string or null",
      "totalScore": number,
      "maxTotalScore": number,
      "questions": [
        {
          "index": number,
          "questionText": "string",
          "studentAnswer": "string",
          "isCorrect": boolean,
          "score": number,
          "maxPoints": number,
          "feedback": "string or null"
        }
      ]
    }`;

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        }));
        
        return JSON.parse(response.text || "{}");
    } catch (e) {
        throw new Error("فشل تحليل الصورة وتصحيحها.");
    }
};
