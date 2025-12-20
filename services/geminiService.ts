import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// وظائف مساعدة لمعالجة الصوت الخام (PCM)
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
            systemInstruction: settings.systemInstruction || "أنت مساعد تعليمي ذكي في نظام مدرسي سعودي متطور. ردودك يجب أن تكون تربوية ودقيقة وباللغة العربية.",
            ...extraConfig
        }
    };
};

export const analyzeMicrosoftFormsData = async (rawData: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    حلل بيانات ملف Excel التالي المصدر من Microsoft Forms:
    "${rawData}"
    
    المطلوب:
    1. استخراج قائمة الطلاب ودرجاتهم (score) والدرجة الكلية (total).
    2. تحديد الأسئلة أو المفاهيم التي واجه فيها معظم الطلاب صعوبة.
    3. تقديم توصية تربوية للمعلم لتحسين النتائج.
    
    أرجع النتيجة بتنسيق JSON:
    {
      "results": [{"studentName": "...", "score": 10, "total": 15}],
      "analysis": "ملخص عام للأداء...",
      "difficultQuestions": ["اسم المفهوم/السؤال الأصعب 1", "..."],
      "recommendations": "نصيحة للمعلم..."
    }
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { throw e; }
};

export const analyzeLearningStyleExcel = async (rawData: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    حلل بيانات ملف Excel لاستجابات الطلاب على اختبار أنماط التعلم (VARK):
    "${rawData}"
    
    المطلوب:
    1. ربط كل طالب بنمطه المناسب (VISUAL, AUDITORY, READ_WRITE, KINESTHETIC).
    2. تقديم ملخص لتوزيع الأنماط في الفصل.
    3. اقتراح 3 نصائح عامة للمعلم بناءً على غلبة الأنماط المكتشفة.
    
    أرجع النتيجة بتنسيق JSON:
    {
      "studentAssignments": [{"studentName": "...", "style": "VISUAL|AUDITORY|READ_WRITE|KINESTHETIC"}],
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
    بناءً على الملاحظات التالية للطالب ${studentName}: "${observations}".
    حدد نمط التعلم الأنسب له وفق نموذج VARK (بصري، سمعي، قرائي، حركي).
    
    أرجع JSON: {"style": "VISUAL|AUDITORY|READ_WRITE|KINESTHETIC", "reasoning": "سبب اختيار هذا النمط باختصار...", "tips": "نصائح تعليمية مخصصة..."}
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
    - ملخص الدرجات: ${context.performance.length} سجل
    
    أجب على سؤال المعلم التالي بناءً على هذه البيانات فقط وبأسلوب تربوي:
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
        lowGrades: performance.filter(p => (p.score / (p.maxScore || 10)) < 0.6).length,
    };
    const prompt = `بناءً على بيانات اليوم: ${JSON.stringify(context)}. اكتب ملخصاً تربوياً ملهماً من 3 نقاط للمعلم ليوم دراسي ناجح (استخدم الإيموجي).`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "جاهز ليوم دراسي مميز! 🚀";
    } catch (e) { return "بالتوفيق في يومك الدراسي! ✨"; }
};

export const suggestSeatingPlan = async (students: any[], criteria: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `
    لديك قائمة طلاب: ${JSON.stringify(students.map(s => ({id: s.id, name: s.name, level: s.stats?.gradeAvg})))}.
    المطلوب: إعادة توزيع المقاعد في الفصل (صفوف وأعمدة) بناءً على المعيار التالي: "${criteria}".
    أرجع النتيجة كـ JSON حصراً: {"seating": [{"studentId": "...", "row": 1, "col": 1}], "reasoning": "شرح تربوي للتوزيع..."}. استخدم العربية.
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
    حلل أداء الطالب: ${student.name}. 
    الحضور: ${attendance.length} سجل، الغياب: ${attendance.filter(a=>a.status==='ABSENT').length}. 
    الدرجات: ${JSON.stringify(performance.map(p=>({t:p.title, s:p.score, m:p.maxScore})))}.
    اكتب تقريراً تربوياً مختصراً باللغة العربية Markdown يشمل: نقاط القوة، التحديات، وتوصية للمستقبل.
    `;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "التحليل غير متاح.";
    } catch (e) { return "خطأ في الاتصال بالذكاء الاصطناعي."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `اكتب رسالة ${tone === 'URGENT' ? 'عاجلة وحازمة' : tone === 'FRIENDLY' ? 'ودية ودافئة' : 'رسمية'} لولي أمر الطالب ${studentName} حول موضوع: ${topic}. استخدم اللغة العربية الفصحى.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `صمم خطة علاجية مختصرة للطالب ${name} في الصف ${grade} لمادة ${subject} في موضوع ${topic}. يجب أن تشمل أهدافاً وأنشطة بسيطة.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أعد تحضير درس ${subject} بعنوان ${topic} لطلاب ${grade}. المدة ${duration} دقيقة. الخطة يجب أن تشمل: التمهيد، الأهداف، العرض، والتقويم.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `أنشئ اختباراً في ${subject} حول موضوع ${topic} لطلاب ${grade}. العدد: ${count} أسئلة، مستوى الصعوبة: ${difficulty}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate a ${difficulty} difficulty MCQ quiz in ${subject} about ${topic} for ${grade}. 
    Quantity: ${count}. JSON: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]. Use Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, grade: string, options: any) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Prepare lesson structure for ${topic} in ${subject} for ${grade}. 
    JSON: [{"id": "1", "type": "CONTENT|ACTIVITY|ASSESSMENT", "title": "...", "content": "..."}]. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const ai = getAIClient();
    const prompt = `Extract ${type} data as JSON array from the following input. Use Arabic. 
    Fields needed: nationalId, studentName, gradeLevel, className, score, total, status, date.`;
    
    // Fix: contents should be a string for single prompts in the SDK
    let contents: any = prompt + "\n" + text;
    if (imageBase64) {
        contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } },
                { text: prompt + "\n" + text }
            ]
        };
    }

    try {
        const response = await ai.models.generateContent({ model, contents, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Map these Excel headers ${JSON.stringify(headers)} to system fields ${JSON.stringify(targetFields)}. 
    Return JSON mapping: {"systemField": "excelHeaderName"}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch (e) { return {}; }
};

export const gradeExamPaper = async (imageBase64: string, exam: Exam) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Grade this student exam paper based on: ${JSON.stringify(exam)}. 
    JSON Output: {"studentNameDetected": "...", "totalScore": 5, "maxTotalScore": 10, "questions": [{"index": 1, "isCorrect": true, "studentAnswer": "..."}]}`;
    
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
    } catch (e) { return null; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate a Saudi curriculum map for ${subject}, ${grade}, ${term}. 
    JSON: [{"unitTitle": "...", "lessons": [{"title": "..."}]}]. Arabic.`;
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
        return { success: true, message: "متصل بـ Gemini بنجاح" };
    } catch (e: any) {
        return { success: false, message: e.message || "فشل الاتصال" };
    }
};

export const generateSlideQuestions = async (context: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Generate 3 MCQ questions from: "${context}". JSON: [{"question": "...", "options": ["...", "..."], "correctAnswer": "..."}]. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Suggest a 2-minute energetic classroom activity for topic: ${topic}. Short, clear, Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch (e) { return ""; }
};