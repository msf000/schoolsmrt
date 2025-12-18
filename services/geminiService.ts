
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

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
            systemInstruction: settings.systemInstruction || "أنت مساعد تعليمي ذكي في نظام مدرسي سعودي متطور. ردودك يجب أن تكون تربوية ودقيقة وباللغة العربية.",
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

export const generateDailyBriefing = async (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const today = new Date().toISOString().split('T')[0];
    const context = {
        totalStudents: students.length,
        absentToday: attendance.filter(a => a.date === today && a.status === 'ABSENT').length,
        lowGrades: performance.filter(p => (p.score / (p.maxScore || 10)) < 0.6).length,
    };
    const prompt = `بناءً على بيانات اليوم: ${JSON.stringify(context)}. اكتب ملخصاً تربوياً ملهماً من 3 نقاط للمعلم ليوم دراسي ناجح (استخدم الإيموجي).`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "جاهز ليوم دراسي مميز! 🚀";
    } catch (e) { return "بالتوفيق في يومك الدراسي! ✨"; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنت معلم خبير. قم بإنشاء اختبار ${difficulty === 'EASY' ? 'سهل' : difficulty === 'HARD' ? 'صعب' : 'متوسط'} لمادة ${subject} موضوع "${topic}" لطلاب ${grade}. 
    يجب أن يتكون الاختبار من ${count} أسئلة متنوعة مع مفتاح الإجابة في النهاية. استخدم لغة عربية فصيحة وتربوية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "خطأ في توليد الاختبار.";
    } catch (e) { return "خطأ في الاتصال بالخدمة."; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنت معلم خبير. قم بإعداد تحضير درس (خطة درس) احترافية لمادة ${subject} موضوع "${topic}" لطلاب ${grade}. 
    المدة الزمنية: ${duration} دقيقة. 
    يجب أن تشمل الخطة: الأهداف السلوكية، الوسائل التعليمية، التمهيد، عرض الدرس، الأنشطة، والتقويم الختامي. استخدم لغة عربية تربوية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "خطأ في توليد تحضير الدرس.";
    } catch (e) { return "خطأ في الاتصال بالخدمة."; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctAnswer']
            }
        }
    });
    const prompt = `Generate a ${difficulty} difficulty quiz for ${grade} students about ${topic} in ${subject}. 
    Include exactly ${count} Multiple Choice Questions (MCQs). 
    Return as a JSON array: [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]. Use Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const prompt = `Grade this exam paper. Exam: ${exam.title}. Key: ${JSON.stringify(exam.questions.map(q => ({id: q.id, ans: q.correctAnswer, pts: q.points})))}. 
    Return JSON: {"studentNameDetected": "...", "totalScore": 10, "maxTotalScore": 20, "questions": [{"index": 1, "isCorrect": true, "score": 2}]}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: prompt }] },
            config
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { throw new Error("فشل تحليل الصورة."); }
};

export const parseRawDataWithAI = async (text: string, type: 'STUDENTS' | 'GRADES' | 'ATTENDANCE', imageBase64?: string) => {
    let schema: any = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } };
    if (type === 'GRADES') schema.items.properties = { studentName: { type: Type.STRING }, score: { type: Type.NUMBER }, subject: { type: Type.STRING } };
    
    const { model, config } = getModelConfig({ responseMimeType: "application/json", responseSchema: schema });
    let prompt = `Extract ${type} data from this input as JSON. Use Arabic. Input: ${text}`;
    let contents: any = { text: prompt };
    if (imageBase64) contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: prompt }] };

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate curriculum map for ${subject}, grade ${grade}, ${term}. Return JSON: [{"unitTitle": "...", "lessons": [{"title": "..."}]}]. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, gradeLevel: string, settings: any): Promise<LessonBlock[]> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Prepare lesson blocks for ${topic} in ${subject} for ${gradeLevel}. JSON: [{"type": "CONTENT", "title": "...", "content": "..."}]. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const generateSlideQuestions = async (context: string, img?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate 3 MCQ questions from: "${context}". JSON: [{"question": "...", "options": ["...", "..."], "correctAnswer": "..."}]. Arabic.`;
    let contents: any = { text: prompt };
    if (img) contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img } }, { text: prompt }] };
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string, type: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Suggest a 2-minute quick activity for topic: ${topic}. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `Analyze performance for student ${student.name}. Arabic Markdown.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "التحليل غير متاح.";
    } catch (e) { return "خطأ في الاتصال."; }
};

export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { model, config } = getModelConfig();
        await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: "test", config }), 1); 
        return { success: true, message: "متصل بنجاح بـ Gemini" };
    } catch (error: any) { return { success: false, message: "غير متصل" }; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]): Promise<Record<string, string>> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Match headers ${headers.join(', ')} to fields ${JSON.stringify(targetFields)}. Return JSON map.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const generateParentMessage = async (name: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Compose a ${tone} message to parent of ${name} about ${topic}. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, weakness: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Remedial plan for ${name} in ${subject} (${grade}). Issue: ${weakness}. Arabic.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};
