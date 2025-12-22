
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, LessonBlock, Exam, AttendanceStatus } from "../types";
import { getAISettings } from "./storageService";

const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// وظائف مساعدة لمعالجة الصوت
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateLessonSuccessKeys = async (topic: string, grade: string) => {
    const { model, config } = getModelConfig();
    const prompt = `
    أنت موجه تربوي. موضوع الدرس اليوم هو "${topic}" للصف "${grade}".
    المطلوب: توليد 3 "مفاتيح نجاح" مختصرة جداً للمعلم ليركز عليها في الحصة لضمان نواتج تعلم عالية.
    أرجع JSON فقط: {"keys": ["مفتاح 1", "مفتاح 2", "مفتاح 3"]}
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config: { ...config, responseMimeType: "application/json" } });
        return JSON.parse(response.text || '{"keys":[]}');
    } catch (e) {
        return { keys: ["شرح المفاهيم الأساسية", "تطبيق عملي", "تقييم ختامي"] };
    }
};

export const predictStudentFuture = async (student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `
    حلل البيانات التالية للطالب ${student.name} وتنبأ بمستواه في الاختبار القادم:
    الدرجات الأخيرة: ${JSON.stringify(performance.slice(-5).map(p=>p.score/p.maxScore))}
    الالتزام (حضور/غياب): ${JSON.stringify(attendance.slice(-10).map(a=>a.status))}
    
    المطلوب: أرجع تنبؤاً تربوياً (تحسن/استقرار/تراجع) مع نصيحة واحدة للمعلم.
    تنسيق Markdown مختصر جداً.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "لا توجد بيانات كافية للتنبؤ حالياً.";
    } catch (e) {
        return "فشل التنبؤ الذكي.";
    }
};

export const generateEngagementQuestion = async (student: Student, lessonTopic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `
    أنت معلم محفز. الطالب "${student.name}" يحتاج للمشاركة اليوم.
    موضوع الدرس الحالي: "${lessonTopic}".
    نمط تعلم الطالب: "${student.learningStyle || 'غير محدد'}".
    
    المطلوب: توليد سؤال واحد مشجع وقصير موجه للطالب مباشرة ليشارك به في الحصة.
    إذا كان نمطه بصري، اجعل السؤال عن رؤية شيء.
    إذا كان حركي، اطلب منه تمثيل أو القيام بشيء.
    بالعربية فقط.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "كيف تصف موضوع اليوم من وجهة نظرك؟";
    } catch (e) {
        return "ما رأيك فيما شرحناه للتو؟";
    }
};

export const processVoiceAttendance = async (audioBase64: string, studentNames: string[]) => {
    const ai = getAIClient();
    const prompt = `
    أنت مساعد تحضير صوتي. استمع للمقطع الصوتي وحدد حالة الحضور للطلاب المذكورين.
    الطلاب المسجلون: ${studentNames.join(', ')}.
    المطلوب: استخراج قائمة JSON بالطلاب وحالتهم (PRESENT أو ABSENT).
    تنسيق الإخراج: {"updates": [{"name": "اسم الطالب", "status": "PRESENT|ABSENT"}]}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-native-audio-preview-09-2025",
            contents: [
                {
                    parts: [
                        { inlineData: { mimeType: 'audio/pcm;rate=16000', data: audioBase64 } },
                        { text: prompt }
                    ]
                }
            ],
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Voice Processing Error:", e);
        return { updates: [] };
    }
};

export const playTextAsSpeech = async (text: string) => {
    const ai = getAIClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `اقرأ النص التالي بوضوح وهدوء: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.start();
            return true;
        }
    } catch (e) {
        console.error("TTS Error:", e);
        return false;
    }
};

const getModelConfig = (extraConfig?: any) => {
    const settings = getAISettings();
    return {
        model: 'gemini-3-flash-preview',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction || "أنت مساعد تعليمي ذكي خبير في علم النفس التربوي ونموذج VARK. مهمتك تحليل استجابات الطلاب بدقة وتطوير خطط دعم تعليمي.",
            ...extraConfig
        }
    };
};

export const generateSmartRemedialPlan = async (student: Student, performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const lowGrades = performance.filter(p => (p.score / p.maxScore) < 0.6);
    const strengths = performance.filter(p => (p.score / p.maxScore) >= 0.85);

    const prompt = `
    صمم خطة علاجية تشخيصية متكاملة للطالب: ${student.name}.
    
    البيانات المتاحة:
    - نمط التعلم (VARK): ${student.learningStyle || 'غير محدد'}.
    - المهارات المتعثرة: ${lowGrades.map(g => `${g.title} (${g.score}/${g.maxScore})`).join(', ')}.
    - مهارات القوة للتحفيز: ${strengths.map(g => g.title).join(', ')}.
    
    المطلوب تنسيق Markdown يشمل:
    1. تشخيص تربوي لأسباب التعثر.
    2. أهداف علاجية محددة.
    3. أنشطة مقترحة تراعي نمط تعلمه (${student.learningStyle}).
    4. نصيحة مخصصة لولي الأمر.
    5. معيار التحقق من التحسن.
    
    استخدم لغة تربوية مشجعة وبالعربية.
    `;
    
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "لم نتمكن من توليد الخطة حالياً.";
    } catch (e) {
        return "حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
};

export const analyzeLearningStyleExcel = async (rawData: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    حلل بيانات ملف Excel التالية (استجابات الطلاب على اختبار أنماط التعلم VARK):
    "${rawData}"
    
    تنسيق الإخراج JSON حصراً:
    {
      "studentAssignments": [{"studentName": "اسم الطالب من الملف", "style": "النمط المحدد بالإنجليزية", "confidence": "high|medium"}],
      "stats": {"VISUAL": 0, "AUDITORY": 0, "READ_WRITE": 0, "KINESTHETIC": 0},
      "tips": ["نصيحة 1", "نصيحة 2", "نصيحة 3"]
    }
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { throw e; }
};

export const diagnoseLearningStyle = async (studentName: string, observations: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    بناءً على الملاحظات السلوكية التالية للطالب ${studentName}: "${observations}".
    حدد نمط التعلم الأنسب له وفق نموذج VARK.
    أرجع JSON: {"style": "VISUAL|AUDITORY|READ_WRITE|KINESTHETIC", "reasoning": "...", "tips": "..."}
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const chatWithData = async (query: string, context: { students: any[], attendance: any[], performance: any[] }) => {
    const { model, config } = getModelConfig();
    const prompt = `
    لديك البيانات التالية للمدرسة:
    - الطلاب: ${JSON.stringify(context.students.slice(0, 50))}
    - ملخص الحضور: ${context.attendance.length} سجل
    
    أجب على سؤال المعلم التالي بناءً على هذه البيانات:
    السؤال: ${query}
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "عذراً، لم أستطع تحليل البيانات حالياً.";
    } catch (e) { return "حدث خطأ في الاتصال بالمساعد الذكي."; }
};

export const generateDailyBriefing = async (students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const today = new Date().toISOString().split('T')[0];
    const context = {
        totalStudents: students.length,
        absentToday: attendance.filter(a => a.date === today && a.status === 'ABSENT').length,
    };
    const prompt = `بناءً على بيانات اليوم: ${JSON.stringify(context)}. اكتب ملخصاً تربوياً ملهماً من 3 نقاط للمعلم ليوم دراسي ناجح.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "جاهز ليوم دراسي مميز! 🚀";
    } catch (e) { return "بالتوفيق في يومك الدراسي! ✨"; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `
    حلل أداء الطالب: ${student.name}. 
    الحضور: ${attendance.length} سجل، الغياب: ${attendance.filter(a=>a.status==='ABSENT').length}. 
    الدرجات: ${JSON.stringify(performance.map(p=>({t:p.title, s:p.score, m:p.maxScore})))}.
    اكتب تقريراً تربوياً مختصراً بالعربية Markdown يشمل: نقاط القوة، التحديات، وتوصية.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "التحليل غير متاح.";
    } catch (e) { return "خطأ في الاتصال بالذكاء الاصطناعي."; }
};

export const suggestSeatingPlan = async (students: any[], criteria: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    لديك قائمة طلاب: ${JSON.stringify(students.map(s => ({id: s.id, name: s.name, level: s.stats?.gradeAvg})))}.
    المطلوب: إعادة توزيع المقاعد في الفصل بناءً على: "${criteria}".
    أرجع JSON حصراً: {"seating": [{"studentId": "...", "row": 1, "col": 1}], "reasoning": "..."}.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `اكتب رسالة لولي أمر الطالب ${studentName} حول: ${topic}. النبرة: ${tone}. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صمم خطة علاجية للطالب ${name} في مادة ${subject} موضوع ${topic}. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أعد تحضير درس ${subject} بعنوان ${topic} لطلاب ${grade}. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنشئ اختباراً في ${subject} موضوع ${topic}. العدد: ${count}، صعوبة: ${difficulty}. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate a ${difficulty} difficulty MCQ quiz in ${subject} about ${topic}. JSON: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, grade: string, options: any) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Prepare lesson structure for ${topic} in ${subject}. JSON: [{"id": "1", "type": "CONTENT|ACTIVITY|ASSESSMENT", "title": "...", "content": "..."}]. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const ai = getAIClient();
    const prompt = `Extract ${type} data as JSON array. Fields: nationalId, studentName, gradeLevel, score, status. Arabic.`;
    let contents: any = prompt + "\n" + text;
    if (imageBase64) {
        contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: prompt + "\n" + text }] };
    }
    try {
        const response = await ai.models.generateContent({ model, contents, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Map Excel headers ${JSON.stringify(headers)} to system fields ${JSON.stringify(targetFields)}. JSON: {"systemField": "excelHeaderName"}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Grade student paper for: ${JSON.stringify(exam)}. JSON: {"totalScore": 5, "questions": [...]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: prompt }] }, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate Saudi curriculum map for ${subject}. JSON: [{"unitTitle": "...", "lessons": [{"title": "..."}]}]. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const checkAIConnection = async () => {
    try {
        const ai = getAIClient();
        await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping' });
        return { success: true, message: "متصل بـ Gemini" };
    } catch (e: any) { return { success: false, message: "فشل الاتصال" }; }
};

export const generateSlideQuestions = async (context: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate 3 MCQ from: "${context}". JSON: [{"question": "...", "options": [...], "correctAnswer": "..."}]. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Suggest a 2-minute energetic classroom activity for: ${topic}. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};
