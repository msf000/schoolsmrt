
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

// Fix: Added generateQuiz for AITools component
export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنت معلم خبير. قم بإنشاء اختبار ${difficulty === 'EASY' ? 'سهل' : difficulty === 'HARD' ? 'صعب' : 'متوسط'} لمادة ${subject} موضوع "${topic}" لطلاب ${grade}. 
    يجب أن يتكون الاختبار من ${count} أسئلة متنوعة مع مفتاح الإجابة في النهاية. استخدم لغة عربية فصيحة وتربوية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return "خطأ في توليد الاختبار."; }
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
    const prompt = `أنت مصحح آلي خبير. قم بتصحيح ورقة الطالب المرفقة بناءً على مفتاح الإجابة التالي: 
    العنوان: ${exam.title}. 
    المفتاح: ${JSON.stringify(exam.questions.map(q => ({id: q.id, ans: q.correctAnswer, pts: q.points})))}. 
    استخرج اسم الطالب إذا وجد، والدرجة الكلية.
    أرجع النتيجة كـ JSON: {"studentNameDetected": "...", "totalScore": 10, "maxTotalScore": 20, "questions": [{"index": 1, "questionText": "...", "studentAnswer": "...", "isCorrect": true, "score": 2}]}`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({
            model, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: prompt }] },
            config
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { throw new Error("فشل تحليل صورة ورقة الاختبار."); }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `بناءً على المنهج السعودي لـ ${subject}، الصف ${grade}، لـ ${term}. 
    قم بإنشاء خريطة توزيع منهج كاملة.
    أرجع JSON كـ مصفوفة وحدات: [{"unitTitle": "...", "lessons": [{"title": "...", "standards": ["..."]}]}]. بالعربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, gradeLevel: string, settings: any): Promise<LessonBlock[]> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `أعد تحضير درس نموذجي كامل لموضوع: ${topic} لطلاب ${gradeLevel} في مادة ${subject}. 
    قسم التحضير إلى عناصر: أهداف، مقدمة، استراتيجيات، محتوى، نشاط، تقييم.
    أرجع JSON: [{"id": "1", "type": "OBJECTIVES", "title": "الأهداف", "content": "..."}, ...] بالعربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

// Fix: Added generateLessonPlan for AITools component
export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنت معلم خبير. قم بإعداد تحضير درس (خطة درس) احترافية لمادة ${subject} موضوع "${topic}" لطلاب ${grade}. 
    المدة الزمنية: ${duration} دقيقة. 
    يجب أن تشمل الخطة: الأهداف السلوكية، الوسائل التعليمية، التمهيد، عرض الدرس، الأنشطة، والتقويم الختامي. استخدم لغة عربية تربوية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return "خطأ في توليد تحضير الدرس."; }
};

export const generateSlideQuestions = async (context: string, img?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `بناءً على محتوى الشاشة التالي: "${context}". 
    قم بتوليد 3 أسئلة تفاعلية سريعة MCQ لتقديمها للطلاب الآن. 
    أرجع JSON: [{"question": "...", "options": ["...", "..."], "correctAnswer": "..."}]. العربية.`;
    let contents: any = { text: prompt };
    if (img) contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img } }, { text: prompt }] };
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string, type: string) => {
    const { model, config } = getModelConfig();
    const prompt = `الطالب يشعر بالملل أو لم يفهم موضوع: ${topic}. 
    اقترح نشاطاً صفياً حركياً أو ذهنيًا سريعاً (دقيقتين) لكسر الجمود وتحفيزهم. بالعربية وبشكل مختصر جداً.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل أداء الطالب ${student.name}. غيابه: ${attendance.filter(a=>a.status==='ABSENT').length} يوم. 
    درجاته الأخيرة: ${JSON.stringify(performance.slice(-5).map(p=>({t:p.title, s:p.score, m:p.maxScore})))}. 
    اكتب تقريراً تربوياً موجزاً يشخص مستواه ويقدم نصيحة عملية له ولولي أمره. استخدم Markdown.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "التحليل غير متاح حالياً.";
    } catch (e) { return "خطأ في الاتصال بخدمة الذكاء الاصطناعي."; }
};

export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { model, config } = getModelConfig();
        await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: "test", config }), 1); 
        return { success: true, message: "متصل بنجاح بـ Gemini 3" };
    } catch (error: any) { return { success: false, message: "غير متصل" }; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]): Promise<Record<string, string>> => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Match spreadsheet headers ${headers.join(', ')} to system fields ${JSON.stringify(targetFields)}. Return JSON map object.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const generateParentMessage = async (name: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صغ رسالة ${tone === 'URGENT' ? 'عاجلة وحازمة' : tone === 'FRIENDLY' ? 'ودية ولطيفة' : 'رسمية'} لولي أمر الطالب ${name} حول موضوع: ${topic}. بالعربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, weakness: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صمم خطة علاجية قصيرة للطالب ${name} (${grade}) في مادة ${subject}. مشكلته: ${weakness}. اجعلها في نقاط عملية للمعلم. بالعربية.`;
    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents: prompt, config }));
        return response.text || "";
    } catch (e) { return ""; }
};

// Fix: Added parseRawDataWithAI for AIDataImport component
export const parseRawDataWithAI = async (text: string, type: 'STUDENTS' | 'GRADES' | 'ATTENDANCE', imageBase64?: string) => {
    let schema: any;
    if (type === 'STUDENTS') {
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    nationalId: { type: Type.STRING },
                    gradeLevel: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING }
                },
                required: ['name']
            }
        };
    } else if (type === 'GRADES') {
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    studentName: { type: Type.STRING },
                    nationalId: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    title: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    maxScore: { type: Type.NUMBER }
                },
                required: ['studentName', 'score']
            }
        };
    } else { // ATTENDANCE
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    studentName: { type: Type.STRING },
                    nationalId: { type: Type.STRING },
                    date: { type: Type.STRING },
                    status: { type: Type.STRING, description: 'PRESENT, ABSENT, or LATE' },
                    subject: { type: Type.STRING },
                    period: { type: Type.NUMBER }
                },
                required: ['studentName', 'status']
            }
        };
    }

    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: schema
    });

    let prompt = `Extract data from the following input as JSON. Input type: ${type}. `;
    if (text) prompt += `Text content: "${text}". `;
    if (imageBase64) prompt += `An image is also provided. `;
    prompt += `Translate names and titles to Arabic if they are in English. Use standard Arabic for all strings.`;

    let contents: any;
    if (imageBase64) {
        contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } },
                { text: prompt }
            ]
        };
    } else {
        contents = { parts: [{ text: prompt }] };
    }

    try {
        const response = await withRetry<GenerateContentResponse>((ai) => ai.models.generateContent({ model, contents, config }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};
