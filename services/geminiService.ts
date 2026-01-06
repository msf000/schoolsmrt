
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the AI client
export const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeFlippedContent = async (text: string) => {
    const ai = getAIClient();
    const prompt = `أنت مساعد تعليمي خبير. قم بتلخيص النص التالي بأسلوب مشوق ومبسط لطلاب المدارس كجزء من استراتيجية الفصل المقلوب. 
    اجعل الملخص على شكل نقاط (Bullet points) وبالعربية Markdown. 
    النص: "${text}"`;
    
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "لم نتمكن من توليد ملخص حالياً.";
    } catch { return "حدث خطأ في محرك الذكاء الاصطناعي."; }
};

export const generateFlippedCheckupQuestions = async (text: string) => {
    const ai = getAIClient();
    const prompt = `بناءً على المحتوى التعليمي التالي، قم بتوليد 3 أسئلة خيارات متعددة (MCQ) للتأكد من فهم الطالب للمحتوى قبل بدء الحصة. 
    أرجع النتيجة بصيغة JSON حصراً كـ array من الكائنات: [{"text": "السؤال", "options": ["أ", "ب", "ج", "د"], "correctAnswer": "الإجابة الصحيحة"}]. 
    المحتوى: "${text}"`;

    try {
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

// Updated: Changed model from gemini-2.5-flash-image to gemini-3-flash-preview for image understanding
export const analyzeAttendancePhoto = async (base64: string, students: any[]) => {
    const ai = getAIClient();
    const prompt = `حلل صورة الحضور هذه وقارنها بقائمة الطلاب: ${students.map(s => s.name).join(', ')}. حدد من الحاضر ومن الغائب. أرجع JSON: {"attendance": [{"name": "...", "status": "PRESENT/ABSENT"}]}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64.split(',')[1], mimeType: 'image/jpeg' } }, { text: prompt }] }
        });
        // Find JSON part
        let text = response.text || "";
        const jsonMatch = text.match(/\{.*\}/s);
        return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    } catch { return { attendance: [] }; }
};

export const generateStudentAnalysis = async (student: any, attendance: any[], performance: any[]) => {
    const ai = getAIClient();
    const prompt = `حلل مستوى الطالب ${student.name}. الحضور: ${attendance.length} سجلات، الدرجات: ${performance.map(p => p.score).join(', ')}. أعطِ تشخيصاً تربوياً وتوصيات باللغة العربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "بانتظار المزيد من البيانات للتحليل.";
    } catch { return "بانتظار المزيد من البيانات للتحليل."; }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleData: any[]) => {
    const ai = getAIClient();
    const prompt = `طابق أعمدة ملف Excel التالية: [${headers.join(', ')}] مع الحقول المطلوبة: [${targetFields.map(f => f.key).join(', ')}]. أرجع JSON: {"targetKey": "headerName"}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch { return {}; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const ai = getAIClient();
    const prompt = `اكتب رسالة لولي أمر الطالب ${studentName} عن موضوع "${topic}" بنبرة ${tone}. بالعربية ودودة.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateRemedialPlan = async (studentName: string, grade: string, subject: string, topic: string) => {
    const ai = getAIClient();
    const prompt = `صمم خطة علاجية للطالب ${studentName} في مادة ${subject} لموضوع ${topic} (الصف ${grade}). بالعربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const ai = getAIClient();
    const prompt = `صمم تحضير درس مادة ${subject} موضوع "${topic}" للصف "${grade}" مدته ${duration} دقيقة. بالعربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const ai = getAIClient();
    const prompt = `ولد اختبار مادة ${subject} موضوع "${topic}" للصف "${grade}" بعدد ${count} أسئلة وصعوبة ${difficulty}. بالعربية.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const suggestQuickActivity = async (topic: string) => {
    const ai = getAIClient();
    const prompt = `اقترح نشاطاً صفياً سريعاً (5 دقائق) لم موضوع "${topic}". بالعربية.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const analyzeClassroomVibe = async (context: any) => {
    const ai = getAIClient();
    const prompt = `حلل جو الفصل: ضجيج ${context.noise}, مزاج ${context.mood}. اقترح حركة تربوية سريعة.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateBrainstormingIdea = async (topic: string) => {
    const ai = getAIClient();
    const prompt = `ولد 5 أفكار عصف ذهني إبداعية لموضوع: ${topic}. بالعربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

// Updated: Changed model from gemini-2.5-flash-image to gemini-3-flash-preview for multimodal data parsing
export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const ai = getAIClient();
    let contents: any = `استخرج البيانات من النص/الصورة وصنفها كـ ${type}. أرجع JSON array من الأشياء المستخرجة فقط.`;
    if (imageBase64) {
        contents = { parts: [{ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }, { text: contents + ` النص المصاحب: ${text}` }] };
    } else {
        contents = contents + ` النص: ${text}`;
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents,
            config: { responseMimeType: "application/json" }
        });
        const resultText = response.text || "[]";
        const jsonMatch = resultText.match(/\[.*\]/s);
        return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
    } catch { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, grade: string, options: any) => {
    const ai = getAIClient();
    const prompt = `ولد كتل تحضير درس (شرح، نشاط، وسائط) لمادة ${subject} موضوع ${topic} للصف ${grade}. أرجع JSON: [{"type": "CONTENT/ACTIVITY/MEDIA", "title": "...", "content": "..."}]`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const ai = getAIClient();
    const prompt = `ولد اختبار خيارات لمادة ${subject} موضوع ${topic} للصف ${grade}. عدد الأسئلة: ${count}. صعوبة: ${difficulty}. أرجع JSON: [{"question": "...", "options": ["...", "..."], "correctAnswer": "..."}]`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

// Fixed: Corrected variable name from base64 to imageBase64
export const gradeExamPaper = async (imageBase64: string, exam: any) => {
    const ai = getAIClient();
    const prompt = `أنت مصحح ذكي. قارن صورة ورقة الإجابة مع نموذج الاختبار هذا: ${JSON.stringify(exam)}. حدد الدرجة الكلية وصحح كل سؤال. أرجع JSON: {"totalScore": 0, "maxTotalScore": 10, "studentNameDetected": "...", "questions": [{"index": 1, "isCorrect": true, "studentAnswer": "...", "feedback": "..."}], "aiRecommendation": "..."}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const ai = getAIClient();
    const prompt = `اعطني توزيع المنهج السعودي لمادة ${subject} الصف ${grade} لـ ${term}. أرجع JSON: [{"unitTitle": "...", "lessons": [{"title": "..."}]}]`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const chatWithData = async (query: string, data: any) => {
    const ai = getAIClient();
    const prompt = `أجب على السؤال: "${query}" بناءً على بيانات الفصل المرفقة: ${JSON.stringify(data)}. كن موجزاً وبالعربية.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "عذراً، لم أستطع تحليل البيانات.";
    } catch { return "حدث خطأ أثناء معالجة طلبك."; }
};

export const diagnoseLearningStyle = async (name: string, obs: string) => {
    const ai = getAIClient();
    const prompt = `شخص نمط تعلم الطالب ${name} بناءً على الملاحظة: "${obs}". أرجع JSON: {"style": "VISUAL/AUDITORY/READ_WRITE/KINESTHETIC", "reasoning": "..."}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};

export const generateClassStrategy = async (varkStats: any, topic: string) => {
    const ai = getAIClient();
    const prompt = `اقترح استراتيجية تدريس لموضوع "${topic}" تناسب توزيع الأنماط: ${JSON.stringify(varkStats)}. بالعربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateWeeklyQuests = async (grade: string, subject: string) => {
    const ai = getAIClient();
    const prompt = `ولد 3 مهام (Quests) أسبوعية محفزة لطلاب الصف ${grade} في مادة ${subject}. أرجع JSON: {"quests": [{"id": "...", "title": "...", "description": "...", "xp": 100, "icon": "..."}]}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch { return { quests: [] }; }
};

export const analyzeBehaviorTrends = async (name: string, log: any[]) => {
    const ai = getAIClient();
    const prompt = `حلل اتجاهات سلوك الطالب ${name} بناءً على السجل: ${JSON.stringify(log)}. أعطِ ملخصاً وتوصيات وقائية. بالعربية.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateStudentAvatar = async (name: string, style: string, desc: string) => {
    const ai = getAIClient();
    const prompt = `رسم أفاتار كرتوني ثلاثي الأبعاد للطالب ${name} بنمط ${style}. الوصف: ${desc}. خلفية بيضاء.`;
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
        return null;
    } catch { return null; }
};

export const generateNarrativeInsights = async (stats: any) => {
    const ai = getAIClient();
    const prompt = `صغ قصة نجاح أو تقرير تحليلي سردي بناءً على الإحصائيات: ${JSON.stringify(stats)}. كن محفزاً وبالعربية.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateStudyPlan = async (topics: string, style: string, days: number) => {
    const ai = getAIClient();
    const prompt = `صمم جدول مذاكرة لمدة ${days} أيام لموضوعات: ${topics}. النمط المفضل: ${style}. بالعربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const generateParentDigest = async (name: string, att: any[], perf: any[]) => {
    const ai = getAIClient();
    const prompt = `لخص رحلة الطالب ${name} الأسبوعية لأهله. الحضور: ${JSON.stringify(att)}, الأداء: ${JSON.stringify(perf)}. بالعربية Markdown ودودة.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

export const suggestSeatingPlan = async (students: any[], criterion: string) => {
    const ai = getAIClient();
    const prompt = `اقترح توزيع مقاعد للفصل (5 أعمدة) للطلاب: ${students.map(s => s.name).join(', ')} بناءً على معيار: "${criterion}". أرجع JSON: {"seating": [{"studentId": "...", "row": 0, "col": 0}]}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};

export const generateSmartRemedialPlan = async (student: any, gaps: any[]) => {
    const ai = getAIClient();
    const prompt = `صمم خطة علاجية مخصصة للطالب ${student.name} لمعالجة الفجوات: ${JSON.stringify(gaps)}. بالعربية Markdown.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch { return ""; }
};

// Added: Missing export for generateGameContent
export const generateGameContent = async (subject: string, topic: string, type: string) => {
    const ai = getAIClient();
    const prompt = type === 'MATCHING' 
        ? `ولد محتوى لعبة توصيل (Matching) لمادة ${subject} موضوع ${topic}. أرجع JSON: {"pairs": [{"term": "...", "definition": "..."}]}`
        : `ولد محتوى لعبة تصنيف (Sorting) لمادة ${subject} موضوع ${topic}. أرجع JSON: {"categories": [{"name": "...", "items": ["...", "..."]}]}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};
