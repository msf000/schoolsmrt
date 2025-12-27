
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
        return response.text || "جاري تجميع خطتك...";
    } catch { return "عذراً، فشل توليد الخطة."; }
};

export const generateParentDigest = async (studentName: string, recentAtt: any[], recentPerf: any[]) => {
    const { model, config } = getModelConfig();
    const data = { att: recentAtt, perf: recentPerf };
    const prompt = `اكتب تقريراً قصصياً ودوداً جداً لولي أمر الطالب ${studentName} يلخص أداءه اليومي/الأسبوعي بناءً على: ${JSON.stringify(data)}. 
    حول الأرقام إلى قصة نجاح. مثلاً بدلاً من "غاب يومين"، قل "افتقدناه في يومين وكنا ننتظر إبداعه". بالعربية بلهجة سعودية بيضاء مهذبة.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "ابنكم يبلي بلاءً حسناً!";
    } catch { return "لا يوجد ملخص متاح حالياً."; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                studentNameDetected: { type: Type.STRING, description: "الاسم المكتوب على الورقة" },
                questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            index: { type: Type.NUMBER },
                            studentAnswer: { type: Type.STRING },
                            isCorrect: { type: Type.BOOLEAN },
                            feedback: { type: Type.STRING, description: "لماذا الإجابة خاطئة؟" }
                        },
                        required: ["index", "studentAnswer", "isCorrect"]
                    }
                },
                totalScore: { type: Type.NUMBER },
                maxTotalScore: { type: Type.NUMBER },
                aiRecommendation: { type: Type.STRING, description: "نصيحة للطالب بناءً على أخطائه" }
            },
            required: ["questions", "totalScore", "maxTotalScore"]
        }
    });

    const prompt = `قم بتصحيح ورقة الاختبار المرفقة. 
    نموذج الإجابة الصحيحة هو: ${JSON.stringify(exam.questions.map(q => ({ q: q.text, a: q.correctAnswer, points: q.points })))}. 
    اقرأ خط الطالب بدقة، حدد الاسم المكتوب، وصحح كل سؤال. إذا كانت الإجابة مطابقة للمعنى تقبله كصحيح.`;
    
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ 
            model, 
            contents: { 
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, 
                    { text: prompt }
                ] 
            }, 
            config 
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { 
        console.error("AI Grading Error:", e);
        return null; 
    }
};

export const analyzeAttendanceTrend = async (history: AttendanceRecord[]) => {
    const { model, config } = getModelConfig();
    const data = history.map(h => `${h.date}: ${h.status}`).join('\n');
    const prompt = `حلل نمط غياب الفصل التالي: \n${data}\n تنبأ بالأيام التي قد يزداد فيها الغياب الأسبوع القادم وقدم نصيحة وقائية للمعلم. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text;
    } catch { return "التحليل التنبؤي غير متاح حالياً."; }
};

// ... بقية الدوال السابقة
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
    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                attendance: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            status: { type: Type.STRING }
                        },
                        required: ["name", "status"]
                    }
                }
            },
            required: ["attendance"]
        }
    });
    const studentList = students.map(s => s.name).join(', ');
    const prompt = `Identify attendance from photo. Look at all people in the image. Match them against this list: [${studentList}]. Status should be PRESENT or ABSENT. Output JSON with names and status.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ 
            model, 
            contents: { 
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, 
                    { text: prompt }
                ] 
            }, 
            config 
        });
        return JSON.parse(response.text || "{\"attendance\": []}");
    } catch (e) { 
        console.error("AI Photo Attendance Error:", e);
        return { attendance: [] }; 
    }
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

/**
 * Predicts the mapping between file headers and target system fields.
 */
// Fix: Added missing predictColumnMapping export
export const predictColumnMapping = async (fileHeaders: string[], targetFields: any[], sampleRows: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Match the following source column headers to the target fields.
    Source Headers: ${JSON.stringify(fileHeaders)}
    Target Fields: ${JSON.stringify(targetFields.map((f: any) => ({ key: f.key, label: f.label })))}
    Sample Data from first rows: ${JSON.stringify(sampleRows)}
    Return a JSON object where keys are target field keys and values are the matching source header names.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return {}; }
};

/**
 * Analyzes behavior trends for a specific student.
 */
// Fix: Added missing analyzeBehaviorTrends export
export const analyzeBehaviorTrends = async (studentName: string, incidents: BehaviorIncident[]) => {
    const { model, config } = getModelConfig();
    const data = incidents.map(i => `${i.date}: ${i.category} (${i.points} points) - ${i.note}`).join('\n');
    const prompt = `Analyze behavior trends for student ${studentName} based on these incidents:
    ${data}
    Provide a professional educational analysis in Arabic Markdown focusing on patterns and suggestions for intervention.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "التحليل غير متاح.";
    } catch { return "خطأ في التحليل."; }
};

/**
 * Generates an AI avatar for a student.
 */
// Fix: Added missing generateStudentAvatar export
export const generateStudentAvatar = async (name: string, style: string, description: string) => {
    const ai = getAIClient();
    const prompt = `A professional 3D avatar icon for a student named ${name}. 
    Learning style: ${style}. 
    Description: ${description}. 
    High quality, vibrant colors, educational theme, clean aesthetic.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("AI Avatar Error:", e);
        return null;
    }
};
