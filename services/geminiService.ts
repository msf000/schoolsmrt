
import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, LessonBlock, Exam } from "../types";
import { getAISettings } from "./storageService";

// Initialize with ENV key - but config can be dynamic
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

// --- RETRY LOGIC ---
async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const isQuotaError = error.status === 429 || 
                             error.code === 429 || 
                             (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));
        
        if (isQuotaError && retries > 0) {
            console.warn(`Gemini Quota exceeded. Retrying in ${delay}ms... (${retries} left)`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

// --- NEW: Check Connection explicitly ---
export const checkAIConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { model } = getConfig();
        // Simple call, usually safe to retry once if transient
        const response = await withRetry(() => ai.models.generateContent({
            model: model,
            contents: "Test connection. Reply with 'OK'.",
        }), 1); 
        if (response.text) return { success: true, message: "تم الاتصال بنجاح!" };
        return { success: false, message: "لم يتم استلام رد من النموذج." };
    } catch (error: any) {
        console.error("AI Connection Test Error:", error);
        let msg = error.message || "فشل الاتصال بمفتاح API.";
        if (msg.includes('429') || msg.includes('quota')) msg = "تم تجاوز حد الاستخدام (Quota). يرجى المحاولة لاحقاً.";
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

// Helper to attempt repairing truncated JSON
function tryRepairJson(jsonString: string): string {
    let fixed = jsonString.trim();
    
    // 1. Close unclosed string
    let inString = false;
    let escape = false;
    for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '\\') {
            escape = !escape;
        } else {
            if (char === '"' && !escape) {
                inString = !inString;
            }
            escape = false;
        }
    }
    if (inString) fixed += '"';

    // 2. Remove trailing comma if exists (common before closing)
    if (fixed.endsWith(',')) fixed = fixed.slice(0, -1);

    // 3. Balance Brackets/Braces
    let openBraces = 0;
    let openBrackets = 0;
    
    // Recalculate context (simple counter, assuming strings are closed now)
    inString = false;
    escape = false;
    for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '\\') { escape = !escape; continue; }
        if (char === '"' && !escape) { inString = !inString; }
        escape = false;

        if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') openBraces = Math.max(0, openBraces - 1);
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
        }
    }

    // Append missing closures
    while (openBraces > 0) { fixed += '}'; openBraces--; }
    while (openBrackets > 0) { fixed += ']'; openBrackets--; }

    return fixed;
}

// --- NEW: Grade Exam Paper ---
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
        const response = await withRetry(() => ai.models.generateContent({
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
        throw new Error("فشل التصحيح الآلي. تأكد من جودة الصورة أو حاول لاحقاً.");
    }
};

// --- NEW: Regenerate Single Block ---
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
    - If it's an "Activity", suggest a specific, engaging task.
    - If it's "Objectives", list 3 clear SMART goals.
    `;

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.8,
                systemInstruction: config.systemInstruction
            }
        }));
        return response.text || "فشلت إعادة الصياغة.";
    } catch (error) {
        console.error("Regenerate Block Error:", error);
        return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.";
    }
};

// --- NEW: Generate Structured Lesson Blocks (Studio Mode) ---
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
    Possible Types: 'OBJECTIVES', 'INTRO', 'STRATEGIES', 'CONTENT', 'ACTIVITY', 'MEDIA', 'ASSESSMENT', 'HOMEWORK'.
    
    JSON Structure:
    [
      { "type": "OBJECTIVES", "title": "الأهداف التعليمية", "content": "- Point 1..." },
      { "type": "INTRO", "title": "التهيئة والتمهيد", "content": "..." },
      { "type": "STRATEGIES", "title": "استراتيجيات التدريس", "content": "..." },
      { "type": "CONTENT", "title": "إجراءات الدرس", "content": "..." },
      { "type": "ACTIVITY", "title": "نشاط تفاعلي", "content": "..." },
      { "type": "ASSESSMENT", "title": "التقويم الختامي", "content": "..." }
    ]
    `;

    try {
        const response = await withRetry(() => ai.models.generateContent({
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
    
    NOTE: If exact 1447 AH data is unavailable, generate the most standard/common syllabus structure for this subject and grade in the Saudi curriculum. Do NOT return empty. Use generic but accurate educational topics if specific textbook data is missing.

    Output Requirements:
    1. Return a JSON Array ONLY. Do not include markdown code blocks.
    2. Structure:
       [
         {
           "unitTitle": "Unit Name in Arabic",
           "lessons": [
             {
               "title": "Lesson Name in Arabic",
               "standards": ["OPTIONAL_CODE"]
             }
           ]
         }
       ]
    `;

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.1, 
                systemInstruction: config.systemInstruction
            }
        }));
        
        const text = response.text || "[]";
        const clean = cleanJsonString(text);
        
        try {
            return JSON.parse(clean);
        } catch (e) {
            return JSON.parse(tryRepairJson(clean));
        }
    } catch (error) {
        console.error("Curriculum Map Gen Error:", error);
        return [];
    }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: 'OFFICIAL' | 'FRIENDLY' | 'URGENT'): Promise<string> => {
    const { model, config } = getConfig();
    const toneDesc = tone === 'OFFICIAL' ? 'رسمية ومهنية' : tone === 'FRIENDLY' ? 'ودية ومشجعة' : 'حازمة وعاجلة';
    const prompt = `بصفتك مساعداً إدارياً، صغ رسالة قصيرة لولي أمر الطالب "${studentName}". الموضوع: ${topic}. النبرة: ${toneDesc}. لا تتجاوز 3 أسطر.`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: 0.7, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const organizeCourseContent = async (rawText: string, subject: string, grade: string): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return rawText;
    const prompt = `Organize this syllabus text for ${subject} (${grade}) into Markdown. Use ### for Units and - for Lessons. Input: """${rawText}"""`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: 0.3, systemInstruction: config.systemInstruction } }));
        return response.text || rawText;
    } catch (error) { return rawText; }
};

export const generateSlideQuestions = async (contextText: string, imageBase64?: string): Promise<any[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) return [];
    const prompt = `Generate 3 MCQ questions in JSON based on context. Schema: [{question, options[], correctAnswer}]. Context: ${contextText}`;
    try {
        const parts: any[] = [{ text: prompt }];
        if (imageBase64) {
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        }
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: { parts }, config: { responseMimeType: "application/json", temperature: config.temperature } }));
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (error) { return []; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.reports) return "التحليل معطل.";
    const prompt = `Analyze student ${student.name} (${student.gradeLevel}). Attendance: ${attendance.length} records. Performance: ${performance.length} records. Write a short professional report in Arabic for the parent.`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return "خطأ في التحليل - يرجى المحاولة لاحقاً."; }
};

export const generateQuiz = async (subject: string, topic: string, gradeLevel: string, questionCount: number, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) return "خدمة الاختبارات معطلة.";
    const prompt = `Create a ${questionCount}-question quiz for ${subject}: ${topic} (${gradeLevel}). Difficulty: ${difficulty}. Arabic. Output format: Q1: ... a) ... b) ... Answer: ...`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return "فشل التوليد"; }
};

export const generateStructuredQuiz = async (subject: string, topic: string, gradeLevel: string, questionCount: number, difficulty: 'EASY' | 'MEDIUM' | 'HARD', context?: { standards?: string[], concepts?: string[] }): Promise<any[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) throw new Error("Disabled");
    let ctx = "";
    if (context?.standards) ctx += `Standards: ${context.standards.join(',')}. `;
    if (context?.concepts) ctx += `Concepts: ${context.concepts.join(',')}. `;
    const prompt = `Generate ${questionCount} questions JSON for ${subject}: ${topic} (${gradeLevel}). Diff: ${difficulty}. ${ctx} Schema: [{text, type:'MCQ'|'TRUE_FALSE', options[], correctAnswer, points}]`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: "application/json", temperature: config.temperature } }));
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (error) { return []; }
};

export const generateRemedialPlan = async (studentName: string, gradeLevel: string, subject: string, weaknessAreas: string): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create remedial plan for ${studentName} (${gradeLevel}) in ${subject}. Weakness: ${weaknessAreas}. Markdown format.`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, gradeLevel: string, duration: string, strategies: string[] = [], resources: string[] = [], objectives: string = "", context?: { standards?: string[], concepts?: string[] }): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    let ctx = "";
    if (context?.standards) ctx += `Standards: ${context.standards.join(',')}. `;
    const prompt = `Create lesson plan Markdown. ${subject}: ${topic} (${gradeLevel}, ${duration}min). Strategies: ${strategies.join(',')}. Resources: ${resources.join(',')}. Objectives: ${objectives}. ${ctx}`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const suggestSyllabus = async (subject: string, gradeLevel: string): Promise<string> => {
    const { model, config } = getConfig();
    const prompt = `List syllabus units/lessons for ${subject} ${gradeLevel} Saudi Curriculum. Bullet points.`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateSemesterPlan = async (subject: string, gradeLevel: string, term: string, weeks: number, classesPerWeek: number, content: string = ""): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create semester plan Markdown table for ${subject} ${gradeLevel} ${term}. ${weeks} weeks, ${classesPerWeek} classes/week. Content: ${content}`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateLearningPlan = async (subject: string, gradeLevel: string, goal: string, durationWeeks: string): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create individual learning plan Markdown table for ${subject} ${gradeLevel}. Goal: ${goal}. Duration: ${durationWeeks} weeks.`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateLearningOutcomesMap = async (subject: string, gradeLevel: string, content: string = ""): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create learning outcomes map Markdown table for ${subject} ${gradeLevel}. Content: ${content}`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } }));
        return response.text || "";
    } catch (error) { return ""; }
};

export const predictColumnMapping = async (headers: string[], targetFields: { key: string; label: string }[], sampleData: any[]): Promise<Record<string, string>> => {
    const { model, config } = getConfig();
    const prompt = `Map headers ${JSON.stringify(headers)} to targets ${JSON.stringify(targetFields)}. Sample: ${JSON.stringify(sampleData)}. Return JSON object.`;
    try {
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: "application/json", temperature: config.temperature } }));
        return JSON.parse(cleanJsonString(response.text || "{}"));
    } catch (error) { return {}; }
};

export const parseRawDataWithAI = async (rawText: string, targetType: 'STUDENTS' | 'GRADES' | 'ATTENDANCE', imageBase64?: string): Promise<any[]> => {
    const { model, config } = getConfig();
    const prompt = `Parse data into JSON array for ${targetType}. Input: ${rawText.slice(0, 6000)}`;
    try {
        const parts: any[] = [{ text: prompt }];
        if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64 } });
        const response = await withRetry(() => ai.models.generateContent({ model: model, contents: { parts }, config: { responseMimeType: "application/json", temperature: config.temperature } }));
        const clean = cleanJsonString(response.text || "[]");
        try { return JSON.parse(clean); } catch(e) { return JSON.parse(tryRepairJson(clean)); }
    } catch (error) { throw new Error("AI Parse Error: " + (error as any).message); }
};

// --- NEW: Panic Button / Quick Activity ---
export const suggestQuickActivity = async (topic: string, gradeLevel: string): Promise<string> => {
    const { model, config } = getConfig();
    const prompt = `
    Emergency Mode! The lesson finished early. 
    Suggest a quick, fun, 5-minute educational activity, game, or riddle for a class of ${gradeLevel} students.
    
    Topic Context: ${topic || 'General Knowledge'}.
    
    Constraints:
    - Must be ready to play immediately (no prep).
    - Engaging and energetic.
    - Output in Arabic.
    - Keep it short (1 paragraph).
    `;
    
    try {
        const response = await withRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { temperature: 0.9, systemInstruction: config.systemInstruction }
        }));
        return response.text || "لعبة: تخمين الكلمة. فكر في كلمة وعلى الطلاب تخمينها.";
    } catch (e) {
        // Fallback if quota exceeded even after retries
        return "لعبة سريعة: لعبة الحروف. اختر حرفاً وعلى الطلاب إيجاد 5 أشياء تبدأ به.";
    }
};
