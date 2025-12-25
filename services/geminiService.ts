
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, LessonBlock, Exam, BehaviorIncident } from "../types";
import { getAISettings } from "./storageService";

const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const getModelConfig = (extraConfig?: any) => {
    const settings = getAISettings();
    return {
        model: 'gemini-3-flash-preview',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction || "أنت مساعد تعليمي ذكي خبير. مهمتك مساعدة المعلم والطالب في تنظيم العملية التعليمية وتعزيز التحفيز.",
            ...extraConfig
        }
    };
};

export const generateStudyPlan = async (topics: string, learningStyle: string, days: number) => {
    const { model, config } = getModelConfig();
    const prompt = `أنا طالب نمط تعلمي هو "${learningStyle}". أريد خطة مذاكرة لهذه موضوعات: "${topics}" لمدة ${days} أيام. المطلوب: جدول يومي، نصائح مخصصة لنمطي، ومصادر مقترحة. بالعربية Markdown.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "جاري تجهيز خطتك...";
    } catch { return "عذراً، فشل توليد الخطة."; }
};

export const generateParentDigest = async (studentName: string, recentAtt: any[], recentPerf: any[]) => {
    const { model, config } = getModelConfig();
    const data = { att: recentAtt, perf: recentPerf };
    const prompt = `اكتب تقريراً قصصياً ودوداً لولي أمر الطالب ${studentName} يلخص أداءه الأسبوعي بناءً على: ${JSON.stringify(data)}. اجعل النبرة إيجابية وتحفيزية. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "ابنكم يبلي بلاءً حسناً!";
    } catch { return "لا يوجد ملخص متاح حالياً."; }
};

export const analyzeBehaviorTrends = async (studentName: string, incidents: BehaviorIncident[]) => {
    const { model, config } = getModelConfig();
    const history = incidents.map(i => `${i.date}: ${i.category} (${i.type})`).join('\n');
    const prompt = `حلل السلوك التاريخي للطالب ${studentName} بناءً على سجلاته: \n${history}. قدم توصية تربوية وعملية للمعلم. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "لا توجد بيانات كافية للتحليل.";
    } catch { return "فشل التحليل الذكي حالياً."; }
};

export const generateStudentAvatar = async (studentName: string, learningStyle: string, description: string) => {
    const ai = getAIClient();
    const prompt = `A high-quality 3D Pixar-style school avatar for a student named "${studentName}", theme: "${description}", incorporating elements of ${learningStyle} learning style. Bright, cheerful, professional lighting, isolated on white.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    } catch { return null; }
};

export const generateBadgeImage = async (prompt: string) => {
    const ai = getAIClient();
    const fullPrompt = `A professional 3D educational achievement badge icon, circular shape, vibrant colors, theme: ${prompt}. High quality, cinematic lighting, isolated on white background.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    } catch { return null; }
};

export const generateNarrativeInsights = async (stats: any) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل بيانات الفصل التالية: ${JSON.stringify(stats)}. المطلوب: فقرة سردية تلخص أهم ملاحظة تربوية ونصيحة للمعلم. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "جاري تجميع الرؤى...";
    } catch { return "الذكاء الاصطناعي مشغول حالياً."; }
};

export const generateWeeklyQuests = async (grade: string, subject: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `صمم 3 مهام أسبوعية لطلاب ${grade} في مادة ${subject}. أرجع JSON فقط: {"quests": [{"id": "q1", "title": "...", "description": "...", "xp": 200, "icon": "emoji"}]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || '{"quests":[]}');
    } catch { return { quests: [] }; }
};

export const analyzeAttendancePhoto = async (imageBase64: string, students: Student[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const studentList = students.map(s => s.name).join(', ');
    const prompt = `Identify attendance from photo. Students: [${studentList}]. JSON output: {"attendance": [{"name": "...", "status": "PRESENT" | "ABSENT"}]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: prompt }] }, config });
        return JSON.parse(response.text || "{\"attendance\": []}");
    } catch { return { attendance: [] }; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل أداء ${student.name}. الدرجات: ${JSON.stringify(performance.map(p=>p.score))}. بالعربية Markdown.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "التقرير غير متاح.";
    } catch { return "خطأ فني."; }
};

export const generateStudentPersona = async (student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Analyze student ${student.name}. JSON: {"title": "...", "description": "...", "tips": ["...", "...", "..."]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || '{}');
    } catch { return { title: "طالب طموح", tips: [] }; }
};

export const generateClassStrategy = async (varkStats: Record<string, number>, topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل أنماط الفصل: ${JSON.stringify(varkStats)}. موضوع الدرس: "${topic}". اقترح استراتيجية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "تعذر التوليد.";
    } catch { return "خطأ اتصال."; }
};

export const chatWithData = async (query: string, context: { students: any[], attendance: any[], performance: any[] }) => {
    const { model, config } = getModelConfig();
    const prompt = `Data: ${JSON.stringify(context.students.slice(0, 5))}. Query: ${query}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "عذراً.";
    } catch { return "خطأ."; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Map headers ${headers.join(',')} to fields. JSON.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return {}; }
};

export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    let contents: any = `Extract ${type} JSON from: ` + text;
    if (imageBase64) {
        contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: `Extract ${type} JSON.` }] };
    }
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate MCQ for ${subject}. JSON.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, grade: string, options: any) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Lesson blocks JSON for ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Curriculum JSON for ${subject} ${grade}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Grade exam image. JSON.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: prompt }] }, config });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};

export const generateSmartRemedialPlan = async (student: Student, performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `Remedial plan for ${student.name}. Arabic Markdown.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "فشل التوليد.";
    } catch { return "خطأ."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Message to parent of ${studentName} about ${topic}. Tone: ${tone}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Lesson plan for ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Quiz for ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const suggestQuickActivity = async (topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Quick activity for ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const generateBrainstormingIdea = async (topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Brainstorming for ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const analyzeClassroomVibe = async (vibeData: { noise: number, mood: string, topic: string }) => {
    const { model, config } = getModelConfig();
    const prompt = `Class vibe: ${vibeData.mood}. Suggest focus activity.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const suggestSeatingPlan = async (stats: any[], criterion: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Suggest seating for ${stats.length} students. Criterion: ${criterion}. JSON: {"seating": [{"studentId": "...", "row": 0, "col": 0}]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return { seating: [] }; }
};

export const diagnoseLearningStyle = async (name: string, obs: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Diagnose VARK for ${name} based on: ${obs}. JSON: {"style": "...", "reasoning": "..."}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};

export const analyzeLearningStyleExcel = async (data: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Analyze VARK from data: ${data}. JSON.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return { studentAssignments: [] }; }
};

export const generateRemedialPlan = async (name: string, grade: string, sub: string, weak: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Remedial plan for ${name} in ${sub} regarding ${weak}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};
