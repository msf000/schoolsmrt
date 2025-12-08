import { GoogleGenAI } from "@google/genai";
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, LessonBlock } from "../types";
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

// Helper to clean JSON string from Markdown
function cleanJsonString(text: string): string {
    if (!text) return "[]";
    // Remove markdown code blocks ```json ... ``` or ``` ... ```
    let clean = text.replace(/```json/gi, '').replace(/```/g, '');
    return clean.trim();
}

// ... existing helpers (tryRepairJson) ...
function tryRepairJson(jsonString: string): string {
    let fixed = jsonString.trim();
    let inString = false;
    let escape = false;
    for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '\\') { escape = !escape; } 
        else {
            if (char === '"' && !escape) { inString = !inString; }
            escape = false;
        }
    }
    if (inString) fixed += '"';
    if (fixed.endsWith(',')) fixed = fixed.slice(0, -1);
    let openBraces = 0;
    let openBrackets = 0;
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
    while (openBraces > 0) { fixed += '}'; openBraces--; }
    while (openBrackets > 0) { fixed += ']'; openBrackets--; }
    return fixed;
}

// --- NEW: Generate Curriculum Map (Units -> Lessons -> Standards) ---
export const generateCurriculumMap = async (
    subject: string,
    grade: string,
    semester: string = "الفصل الدراسي الأول"
): Promise<any[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) throw new Error("AI Planning is disabled");

    const prompt = `
    Act as a specialized Educational Consultant for the Saudi Ministry of Education (MOE) Curriculum (Tracks System / نظام المسارات).
    
    TARGET: Extract the Table of Contents (Units and Lessons) for the **1447 AH (2025-2026) Edition**.
    
    Details:
    - Subject: ${subject}
    - Grade Level: ${grade}
    - Semester/Term: ${semester}.
    
    **MANDATORY SYLLABUS FOR EARTH AND SPACE SCIENCE (علم الأرض والفضاء):**
    If the subject is "علم الأرض والفضاء" (Earth and Space Science), use the following structure depending on the semester:

    **IF SEMESTER IS "الفصل الدراسي الأول" (Term 1):**
    1. **الفصل 1: تطور الكون (Evolution of the Universe)**
       - 1-1 نشأة الكون (Origin of the Universe) - Code: ES.12.1.1
       - 1-2 النجوم والمجرات (Stars and Galaxies) - Code: ES.12.1.2
    
    2. **الفصل 2: الميكانيكا السماوية (Celestial Mechanics)**
       - 2-1 قانون الجاذبية وقوانين كبلر (Gravitation and Kepler's Laws) - Code: ES.12.2.1
       - 2-2 التقنية الفضائية (Space Technology) - Code: ES.12.2.2
    
    3. **الفصل 3: المعادن (Minerals)**
       - 3-1 ما المعدن؟ (What is a Mineral?) - Code: ES.12.3.1
       - 3-2 أنواع المعادن وأهميتها (Types of Minerals) - Code: ES.12.3.2
    
    4. **الفصل 4: الصخور (Rocks)**
       - 4-1 الصخور النارية (Igneous Rocks) - Code: ES.12.4.1
       - 4-2 الصخور الرسوبية (Sedimentary Rocks) - Code: ES.12.4.2
       - 4-3 الصخور المتحولة (Metamorphic Rocks) - Code: ES.12.4.3
    
    5. **الفصل 5: الصفائح الأرضية (Plate Tectonics)**
       - 5-1 انجراف القارات (Continental Drift) - Code: ES.12.5.1
       - 5-2 توسع قاع المحيط (Seafloor Spreading) - Code: ES.12.5.2
       - 5-3 حدود الصفائح وأسباب حركتها (Plate Boundaries) - Code: ES.12.5.3
    
    6. **الفصل 6: البراكين والزلازل (Volcanoes & Earthquakes)**
       - 6-1 ما البركان؟ (What is a Volcano?) - Code: ES.12.6.1
       - 6-2 الثورانات البركانية (Volcanic Eruptions) - Code: ES.12.6.2
       - 6-3 الأمواج الزلزالية وبنية الأرض (Seismic Waves) - Code: ES.12.6.3
       - 6-4 قياس الزلازل وتحديد أماكنها (Measuring Earthquakes) - Code: ES.12.6.4
       - 6-5 الزلازل والمجتمع (Earthquakes and Society) - Code: ES.12.6.5

    **IF SEMESTER IS "الفصل الدراسي الثاني" (Term 2):**
    1. **الفصل 1: الكواكب (The Planets)**
       - الكواكب الداخلية (Inner Planets) - Code: ES.S2.1.1
       - الكواكب الخارجية والأجرام الأخرى (Outer Planets) - Code: ES.S2.1.2

    2. **الفصل 2: الشمس والبيئة الفضائية (The Sun)**
       - الشمس (البيئة الفضائية) - Code: ES.S2.2.1
       - النشاط الشمسي - Code: ES.S2.2.2

    3. **الفصل 3: أدوات الفلك (Astronomy Tools)**
       - الطيف الكهرومغناطيسي - Code: ES.S2.3.1
       - المناظير الأرضية والفضائية - Code: ES.S2.3.2

    6. **الفصل 6: جيولوجيا المملكة (Geology of KSA)**
       - صخور المملكة العربية السعودية - Code: ES.S2.6.1
       - الصفيحة العربية وتكويناتها - Code: ES.S2.6.2
       - المياه الجوفية في المملكة - Code: ES.S2.6.3

    **For Other Subjects:**
    Align with the official Saudi National Curriculum (1447 AH) as presented on the 'Ein' portal.

    Output Requirements:
    1. Return a JSON Array ONLY.
    2. Structure:
       [
         {
           "unitTitle": "Unit Name",
           "lessons": [
             {
               "title": "Lesson Name",
               "standards": ["CODE"]
             }
           ]
         }
       ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.1,
                systemInstruction: config.systemInstruction
            }
        });
        
        const text = response.text || "[]";
        const clean = cleanJsonString(text);
        return JSON.parse(clean);
    } catch (error) {
        console.error("Curriculum Map Gen Error:", error);
        return [];
    }
};

// --- NEW: Generate Structured Lesson Blocks (Studio Mode) ---
export const generateLessonBlocks = async (
    subject: string,
    topic: string,
    gradeLevel: string,
    settings: { includeActivity: boolean, includeVideo: boolean, includeWorksheet: boolean }
): Promise<LessonBlock[]> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) throw new Error("AI Planning is disabled");

    const prompt = `
    Act as an expert teacher in the Saudi Curriculum (1447 AH).
    Create a structured lesson plan for the "Lesson Studio".
    
    Subject: ${subject}
    Topic: ${topic}
    Grade: ${gradeLevel}
    
    Settings:
    - Include Kinetic Activity? ${settings.includeActivity ? 'Yes' : 'No'}
    - Suggest Video Content? ${settings.includeVideo ? 'Yes' : 'No'}
    - Include Worksheet Idea? ${settings.includeWorksheet ? 'Yes' : 'No'}

    **SPECIAL CONTEXT for "Earth and Space Science" (علم الأرض والفضاء):**
    If the topic is related to "Origin of the Universe" (نشأة الكون), "Big Bang" (الانفجار العظيم), or "Galaxies" (المجرات):
    - Ensure alignment with Chapter 1: Evolution of the Universe.
    - Mention the Big Bang Theory and evidence (Hubble's Law).
    - Mention the expansion of the universe.

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
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.5,
                systemInstruction: config.systemInstruction
            }
        });
        const text = response.text || "[]";
        const blocks: LessonBlock[] = JSON.parse(cleanJsonString(text));
        
        // Add IDs to blocks for frontend handling
        return blocks.map(b => ({ ...b, id: Date.now().toString() + Math.random().toString(36).substr(2,9) }));
    } catch (error) {
        console.error("Lesson Studio Gen Error:", error);
        return [];
    }
};

// ... existing functions (generateParentMessage, organizeCourseContent, generateSlideQuestions, generateStudentAnalysis, generateQuiz, generateStructuredQuiz, generateRemedialPlan, generateLessonPlan, suggestSyllabus, generateSemesterPlan, generateLearningPlan, generateLearningOutcomesMap, predictColumnMapping, parseRawDataWithAI) ...
export const generateParentMessage = async (studentName: string, topic: string, tone: 'OFFICIAL' | 'FRIENDLY' | 'URGENT'): Promise<string> => {
    const { model, config } = getConfig();
    const toneDesc = tone === 'OFFICIAL' ? 'رسمية ومهنية' : tone === 'FRIENDLY' ? 'ودية ومشجعة' : 'حازمة وعاجلة';
    const prompt = `بصفتك مساعداً إدارياً، صغ رسالة قصيرة لولي أمر الطالب "${studentName}". الموضوع: ${topic}. النبرة: ${toneDesc}. لا تتجاوز 3 أسطر.`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: 0.7, systemInstruction: config.systemInstruction } });
        return response.text || "";
    } catch (error) { return ""; }
};

export const organizeCourseContent = async (rawText: string, subject: string, grade: string): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return rawText;
    const prompt = `Organize this syllabus text for ${subject} (${grade}) into Markdown. Use ### for Units and - for Lessons. Input: """${rawText}"""`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: 0.3, systemInstruction: config.systemInstruction } });
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
        const response = await ai.models.generateContent({ model: model, contents: { parts }, config: { responseMimeType: "application/json", temperature: config.temperature } });
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (error) { return []; }
};

export const generateStudentAnalysis = async (student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[]): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.reports) return "التحليل معطل.";
    const prompt = `Analyze student ${student.name} (${student.gradeLevel}). Attendance: ${attendance.length} records. Performance: ${performance.length} records. Write a short professional report in Arabic for the parent.`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
        return response.text || "";
    } catch (error) { return "خطأ في التحليل"; }
};

export const generateQuiz = async (subject: string, topic: string, gradeLevel: string, questionCount: number, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.quiz) return "خدمة الاختبارات معطلة.";
    const prompt = `Create a ${questionCount}-question quiz for ${subject}: ${topic} (${gradeLevel}). Difficulty: ${difficulty}. Arabic. Output format: Q1: ... a) ... b) ... Answer: ...`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
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
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: "application/json", temperature: config.temperature } });
        return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (error) { return []; }
};

export const generateRemedialPlan = async (studentName: string, gradeLevel: string, subject: string, weaknessAreas: string): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create remedial plan for ${studentName} (${gradeLevel}) in ${subject}. Weakness: ${weaknessAreas}. Markdown format.`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
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
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
        return response.text || "";
    } catch (error) { return ""; }
};

export const suggestSyllabus = async (subject: string, gradeLevel: string): Promise<string> => {
    const { model, config } = getConfig();
    const prompt = `List syllabus units/lessons for ${subject} ${gradeLevel} Saudi Curriculum 1447. Bullet points.`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature } });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateSemesterPlan = async (subject: string, gradeLevel: string, term: string, weeks: number, classesPerWeek: number, content: string = ""): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create semester plan Markdown table for ${subject} ${gradeLevel} ${term}. ${weeks} weeks, ${classesPerWeek} classes/week. Content: ${content}`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateLearningPlan = async (subject: string, gradeLevel: string, goal: string, durationWeeks: string): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create individual learning plan Markdown table for ${subject} ${gradeLevel}. Goal: ${goal}. Duration: ${durationWeeks} weeks.`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateLearningOutcomesMap = async (subject: string, gradeLevel: string, content: string = ""): Promise<string> => {
    const { model, config, enabled } = getConfig();
    if (!enabled.planning) return "Disabled";
    const prompt = `Create learning outcomes map Markdown table for ${subject} ${gradeLevel}. Content: ${content}`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { temperature: config.temperature, systemInstruction: config.systemInstruction } });
        return response.text || "";
    } catch (error) { return ""; }
};

export const predictColumnMapping = async (headers: string[], targetFields: { key: string; label: string }[], sampleData: any[]): Promise<Record<string, string>> => {
    const { model, config } = getConfig();
    const prompt = `Map headers ${JSON.stringify(headers)} to targets ${JSON.stringify(targetFields)}. Sample: ${JSON.stringify(sampleData)}. Return JSON object.`;
    try {
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: "application/json", temperature: config.temperature } });
        return JSON.parse(cleanJsonString(response.text || "{}"));
    } catch (error) { return {}; }
};

export const parseRawDataWithAI = async (rawText: string, targetType: 'STUDENTS' | 'GRADES' | 'ATTENDANCE', imageBase64?: string): Promise<any[]> => {
    const { model, config } = getConfig();
    const prompt = `Parse data into JSON array for ${targetType}. Input: ${rawText.slice(0, 6000)}`;
    try {
        const parts: any[] = [{ text: prompt }];
        if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64 } });
        const response = await ai.models.generateContent({ model: model, contents: { parts }, config: { responseMimeType: "application/json", temperature: config.temperature } });
        const clean = cleanJsonString(response.text || "[]");
        try { return JSON.parse(clean); } catch(e) { return JSON.parse(tryRepairJson(clean)); }
    } catch (error) { throw new Error("AI Parse Error"); }
};
