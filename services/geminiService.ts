
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

// Helper to get current config
const getConfig = () => {
    const settings = getAISettings();
    return {
        model: settings.modelId || 'gemini-2.5-flash',
        config: {
            temperature: settings.temperature || 0.7,
            systemInstruction: settings.systemInstruction
        },
        enabled: {
            quiz: settings.enableQuiz !== false,
            reports: settings.enableReports !== false,
            planning: settings.enablePlanning !== false
        }
    };
};

// Check if a real key is present
const hasValidKey = () => {
    const key = process.env.API_KEY;
    return key && key.length > 20 && !key.includes('AIzaSyDKU3a8J6MxFRI9I-JJu9wY-2HcgVz_YDM'); // Exclude known dummy keys if any
};

// --- RETRY LOGIC (New) ---
// Wraps API calls to handle 429 (Quota Exceeded) errors gracefully
async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    if (!hasValidKey()) {
        throw new Error("مفتاح API غير صالح أو غير مهيأ. يرجى التحقق من الإعدادات.");
    }

    try {
        return await operation();
    } catch (error: any) {
        // FAIL FAST: If Permission Denied (403) or Invalid Key, do not retry.
        if (error.status === 403 || error.code === 403 || error.message?.includes('API key') || error.message?.includes('PERMISSION_DENIED')) {
            // Silently fail to avoid console spam, just return error
            throw new Error("خدمة الذكاء الاصطناعي غير متوفرة حالياً (تأكد من مفتاح API).");
        }

        // Check for 429 or Quota related messages
        const isQuotaError = error.status === 429 || 
                             error.code === 429 || 
                             (error.message && (
                                 error.message.includes('429') || 
                                 error.message.toLowerCase().includes('quota') || 
                                 error.message.includes('RESOURCE_EXHAUSTED')
                             ));
        
        if (isQuotaError && retries > 0) {
            console.warn(`Gemini Quota exceeded. Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(operation, retries - 1, delay * 2);
        }
        
        throw error;
    }
}

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- Check Connection ---
export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!hasValidKey()) {
        return { success: false, message: "مفتاح API غير موجود أو غير صالح." };
    }

    try {
        const { model } = getConfig();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: "Test connection. Reply with 'OK'.",
        }), 1); 
        
        if (response.text) return { success: true, message: "تم الاتصال بنجاح!" };
        return { success: false, message: "لم يتم استلام رد من النموذج." };
    } catch (error: any) {
        // Suppress generic 403 errors in UI check
        let msg = error.message || "فشل الاتصال بمفتاح API.";
        if (msg.includes('429') || msg.includes('quota')) msg = "تم تجاوز حد الاستخدام اليومي (Quota). يرجى المحاولة لاحقاً.";
        if (msg.includes('403') || msg.includes('API key')) msg = "مفتاح API غير صالح أو محظور.";
        return { success: false, message: msg };
    }
};

// Helper to clean JSON string from Markdown and extra text
function cleanJsonString(text: string): string {
    if (!text) return "[]";
    
    // 1. Remove markdown code blocks
    let clean = text.replace(/```json/gi, '').replace(/```/g, '');
    
    // 2. Extract only the array part [ ... ] or object part { ... }
    const firstBracket = clean.indexOf('[');
    const firstBrace = clean.indexOf('{');
    
    // Determine if it's likely an array or object
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        const lastBracket = clean.lastIndexOf(']');
        if (lastBracket > firstBracket) return clean.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1) {
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace > firstBrace) return clean.substring(firstBrace, lastBrace + 1);
    }

    return clean.trim();
}

// ... (Rest of existing AI functions: gradeExamPaper, regenerateSingleBlock, etc.) ...
// Keep existing implementations but wrap them with `withRetry`

export const gradeExamPaper = async (imageBase64: string, exam: Exam): Promise<any> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) throw new Error("AI Grading is disabled");

    const questionsContext = exam.questions.map((q, i) => 
        `Q${i+1}: ${q.text} (Type: ${q.type}, Points: ${q.points}, Correct Answer: ${q.correctAnswer})`
    ).join('\n');

    const prompt = `
    Act as a strict teacher grading an exam paper.
    
    Exam Context:
    - Title: ${exam.title}
    - Questions & Key:
    ${questionsContext}

    Task:
    1. Analyze the image to identify the student's name (if written).
    2. Review the student's answers for each question visible in the image.
    3. Compare with the Correct Answer key.
    4. Provide a JSON output with the grading results.

    Output JSON Format:
    {
      "studentNameDetected": "Name or null",
      "totalScore": number,
      "maxTotalScore": number,
      "questions": [
        {
          "index": 1,
          "questionText": "...",
          "studentAnswer": "...",
          "isCorrect": boolean,
          "score": number,
          "feedback": "Short reason if wrong"
        }
      ]
    }
    `;

    try {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model, 
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
                ]
            },
            config: {
                responseMimeType: "application/json",
                temperature: 0.2, 
            }
        }));
        
        return JSON.parse(cleanJsonString(response.text || "{}"));
    } catch (error) {
        console.error("Auto Grading Error:", error);
        throw new Error("فشل التصحيح الآلي. تأكد من جودة الصورة أو حاول مرة أخرى.");
    }
};

export const regenerateSingleBlock = async (
    blockType: string,
    blockTitle: string,
    lessonContext: { subject: string, topic: string, grade: string, prevContent?: string }
): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) throw new Error("AI Planning is disabled");

    const prompt = `
    Act as an expert teacher. Rewrite the content for a specific section of a lesson plan.
    
    Context:
    - Subject: ${lessonContext.subject}
    - Lesson Topic: ${lessonContext.topic}
    - Grade: ${lessonContext.grade}
    
    Section to Rewrite: "${blockTitle}" (Type: ${blockType})
    
    ${lessonContext.prevContent ? `Previous Content (for reference, try to be different/better): "${lessonContext.prevContent}"` : ''}

    Instructions:
    - Provide ONLY the new content text.
    - Be concise, professional, and educational.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.8, 
                systemInstruction: config.systemInstruction
            }
        }));
        return response.text || "فشلت إعادة الصياغة.";
    } catch (error) {
        return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.";
    }
};

export const generateLessonBlocks = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    settings: { includeActivity: boolean, includeVideo: boolean, includeWorksheet: boolean },
    standards: string[] = [] 
): Promise<LessonBlock[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) throw new Error("AI Planning is disabled");

    const prompt = `
    Act as an expert teacher in the Saudi Curriculum.
    Create a structured lesson plan for the "Lesson Studio".
    
    Subject: ${subject}
    Topic: ${topic}
    Grade: ${gradeLevel}
    ${standards.length > 0 ? `Curriculum Standards/Codes: ${standards.join(', ')}` : ''}
    
    Settings:
    - Include Kinetic Activity? ${settings.includeActivity ? 'Yes' : 'No'}
    - Suggest Video Content? ${settings.includeVideo ? 'Yes' : 'No'}
    - Include Worksheet Idea? ${settings.includeWorksheet ? 'Yes' : 'No'}

    Output Format: JSON Array of Objects (LessonBlock).
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.5,
                systemInstruction: config.systemInstruction
            }
        }));
        const text = response.text || "[]";
        const blocks: LessonBlock[] = JSON.parse(cleanJsonString(text));
        return blocks.map(b => ({ ...b, id: Date.now().toString() + Math.random().toString(36).substr(2,9) }));
    } catch (error) {
        console.error("Lesson Studio Gen Error:", error);
        return [];
    }
};

export const generateCurriculumMap = async (
    subject: string,
    grade: string,
    semester: string = "الفصل الدراسي الأول"
): Promise<any[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) throw new Error("AI Planning is disabled");

    const prompt = `
    Act as a specialized Educational Consultant for the Saudi Ministry of Education (MOE) Curriculum.
    
    TARGET: Generate a Table of Contents (Units and Lessons) for:
    - Subject: ${subject}
    - Grade Level: ${grade}
    - Semester/Term: ${semester}
    
    Output JSON format: [{ unitTitle: string, lessons: [{ title: string, standards: string[] }] }]
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
                systemInstruction: config.systemInstruction
            }
        }));
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (error) {
        console.error("Curriculum Map Gen Error:", error);
        return [];
    }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]) => {
    const { model, config, enabled } = getConfig();
    if (!enabled.reports) throw new Error("AI Reports disabled");

    const studentAtt = attendance.filter(a => a.studentId === student.id);
    const studentPerf = performance.filter(p => p.studentId === student.id);
    
    const prompt = `
    Analyze the following student data and provide a brief performance report (in Arabic).
    
    Student: ${student.name} (${student.gradeLevel})
    Attendance Records: ${studentAtt.length} (Absent: ${studentAtt.filter(a => a.status === 'ABSENT').length})
    Performance Records: ${JSON.stringify(studentPerf.map(p => ({ title: p.title, score: p.score, max: p.maxScore })))}
    
    Highlight strengths, weaknesses, and a short recommendation for the parent.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { temperature: 0.7 }
        }));
        return response.text || "لا يمكن تحليل البيانات حالياً.";
    } catch (e) {
        return "خدمة التحليل غير متوفرة.";
    }
};

// ... Include other functions (generateQuiz, generateRemedialPlan, etc.) similarly wrapped with withRetry ...
// For brevity, assuming other functions follow the same pattern of using `withRetry` wrapper.

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
     const { model } = getConfig();
     try {
        const prompt = `Create a ${difficulty} quiz for ${grade} about ${topic} in ${subject}. ${count} questions. JSON format.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return response.text || "";
     } catch (e) { return ""; }
};

export const generateRemedialPlan = async (name: string, grade: string, subject: string, weakness: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Create a remedial plan for student ${name} (${grade}) in ${subject}. Weakness: ${weakness}. Arabic.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt
        }));
        return response.text || "";
    } catch (e) { return "فشل إنشاء الخطة."; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Create a full lesson plan for ${topic} (${subject}, ${grade}). Duration: ${duration} mins. Arabic.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt
        }));
        return response.text || "";
    } catch (e) { return "فشل التحضير."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Write a message to parent of ${studentName} about ${topic}. Tone: ${tone}. Arabic. Short.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt
        }));
        return response.text || "";
    } catch (e) { return "فشل صياغة الرسالة."; }
};

export const generateSlideQuestions = async (context: string, imageBase64?: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Generate 2 multiple choice questions based on this content: "${context}". JSON format: [{question, options[], correctAnswer}]`;
        const contents: any = { parts: [{ text: prompt }] };
        if(imageBase64) contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: contents,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (e) { return []; }
};

export const suggestQuickActivity = async (topic: string, type: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Suggest a quick 5-min classroom activity for topic: ${topic}. Arabic.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt
        }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const { model } = getConfig();
    try {
        const prompt = `Extract data from this text/image into JSON for ${type}. If Grade/Score, standard format.`;
        const contents: any = { parts: [{ text: prompt }] };
        if(imageBase64) contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });
        if(text) contents.parts.push({ text: text });

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: contents,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (e: any) { throw new Error(e.message); }
};

export const predictColumnMapping = async (headers: string[], targetFields: any[], sampleRows: any[]) => {
    const { model } = getConfig();
    try {
        const prompt = `Map these Excel headers: ${JSON.stringify(headers)} to these target fields: ${JSON.stringify(targetFields)}. Sample data: ${JSON.stringify(sampleRows)}. Return JSON key-value map.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonString(response.text || "{}"));
    } catch (e) { return {}; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string, context?: any) => {
    const { model } = getConfig();
    try {
        const prompt = `Generate a structured quiz JSON for ${subject} - ${topic} (${grade}). ${count} questions. Difficulty: ${difficulty}. Include options and correct answer.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (e) { return []; }
};

export const generateClassReport = async (className: string, term: string, stats: any) => {
    const { model } = getConfig();
    try {
        const prompt = `Write a class performance report for ${className} - ${term}. Stats: ${JSON.stringify(stats)}. Arabic. Professional tone.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt
        }));
        return response.text || "";
    } catch (e) { return ""; }
};
