
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

export const generateClassroomPulse = async (vibeData: { noise: number, mood: string, lastTopic: string }) => {
    const { model, config } = getModelConfig();
    const prompt = `بيانات الفصل الحالية: مستوى الضجيج ${vibeData.noise}/5، مزاج الطلاب ${vibeData.mood}، الموضوع الحالي "${vibeData.lastTopic}". 
    قدم تحليلًا تربويًا بليغًا في سطرين ونشاطًا حركيًا أو ذهنيًا سريعًا (30 ثانية) لتنشيط الفصل. بالعربية.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "الفصل يبلي بلاءً حسناً!";
    } catch { return "التحليل الذكي للنبض غير متاح حالياً."; }
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

export const predictColumnMapping = async (fileHeaders: string[], targetFields: any[], sampleData: any[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const targetKeys = targetFields.map(f => f.key).join(', ');
    const sample = sampleData.length > 0 ? JSON.stringify(sampleData[0]) : "No data available";
    const prompt = `Match the following file headers to the system keys.
    File Headers: [${fileHeaders.join(', ')}]
    System Keys: [${targetKeys}]
    Sample data from first row: ${sample}
    Return a JSON object where the keys are the system keys and the values are the corresponding file headers. 
    Only include matches you are confident about.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || '{}');
    } catch { return {}; }
};

export const generateClassStrategy = async (varkStats: Record<string, number>, topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Class Statistics (Learning Styles - VARK): ${JSON.stringify(varkStats)}. Topic: ${topic}. 
    Suggest a comprehensive teaching strategy in Arabic using Markdown that engages all student types.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "الاستراتيجية غير متوفرة حالياً.";
    } catch { return "خطأ في الاتصال بمحرك الاستراتيجيات."; }
};

export const analyzeBehaviorTrends = async (studentName: string, incidents: BehaviorIncident[]) => {
    const { model, config } = getModelConfig();
    const data = incidents.map(i => `${i.date}: ${i.category} (${i.points} points) - ${i.note}`).join('\n');
    const prompt = `Analyze behavior trends for student ${studentName} based on these incidents recorded in the system:\n${data}\nProvide a summary of patterns and pedagogical advice for improvement in Arabic Markdown.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "تحليل السلوك غير متوفر لهذا الطالب.";
    } catch { return "خطأ في تحليل البيانات السلوكية."; }
};

export const generateStudentAvatar = async (studentName: string, learningStyle: string, description: string) => {
    try {
        const ai = getAIClient();
        const prompt = `A professional, high-quality 3D stylized character avatar icon for a student named ${studentName}. 
        Theme based on learning style: ${learningStyle}. 
        User details: ${description}. 
        Clean white background, vibrant colors, premium 3D render look.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("AI Avatar Gen Error:", e);
        return null;
    }
};

export const generateNarrativeInsights = async (stats: any) => {
    const { model, config } = getModelConfig();
    const prompt = `حلل بيانات الفصل التالية: ${JSON.stringify(stats)}. المطلوب: فقرة سردية تلخص أهم ملاحظة تربوية ونصيحة للمعلم. بالعربية بأسلوب ودود ومحفز.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "جاري تجميع الرؤى...";
    } catch { return "الذكاء الاصطناعي مشغول حالياً."; }
};

export const generateWeeklyQuests = async (grade: string, subject: string) => {
    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                quests: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            xp: { type: Type.NUMBER },
                            icon: { type: Type.STRING, description: "One Emoji icon" }
                        }
                    }
                }
            }
        }
    });

    const prompt = `صمم 3 مهام (Quests) أسبوعية محفزة لطلاب ${grade} في مادة ${subject}. 
    الهدف هو زيادة التفاعل. اجعل العناوين جذابة مثل أسماء الألعاب.`;
    
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
    const prompt = `حلل أداء ${student.name}. الدرجات: ${JSON.stringify(performance.map(p=>p.score))}. بالعربية Markdown. ركز على نقاط القوة والضعف.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "التقرير غير متاح حالياً.";
    } catch { return "حدث خطأ في الاتصال بمحرك التحليل."; }
};

export const generateStudentPersona = async (student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[]) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `حلل شخصية الطالب ${student.name} بناءً على بياناته. أرجع JSON: {"title": "لقب شرفي"، "description": "وصف تربوي لشخصيته"، "tips": ["نصيحة 1", "نصيحة 2", "نصيحة 3"]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || '{}');
    } catch { return { title: "طالب طموح", tips: [] }; }
};

export const chatWithData = async (query: string, context: { students: any[], attendance: any[], performance: any[] }) => {
    const { model, config } = getModelConfig();
    const prompt = `Context Data: Students: ${JSON.stringify(context.students.slice(0, 5))}. Attendance Sample: ${JSON.stringify(context.attendance.slice(0, 5))}. 
    User Query: ${query}. Answer briefly in Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "عذراً، لم أستطع تحليل الطلب.";
    } catch { return "خطأ في الاتصال بالذكاء الاصطناعي."; }
};

export const parseRawDataWithAI = async (text: string, type: string, imageBase64?: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    let contents: any = `Extract ${type} JSON data from following text: ` + text;
    if (imageBase64) {
        contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } }, { text: `Extract ${type} JSON from image.` }] };
    }
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
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
                }
            }
        }
    });
    const prompt = `Generate ${count} MCQ questions for ${subject} about ${topic} for ${grade}. Difficulty: ${difficulty}. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateLessonBlocks = async (subject: string, topic: string, grade: string, options: any) => {
    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['CONTENT', 'MEDIA', 'ACTIVITY'] }
                }
            }
        }
    });
    const prompt = `Design a comprehensive lesson plan for ${subject}: ${topic} for ${grade}. Include intro, core concept, and activity.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateCurriculumMap = async (subject: string, grade: string, term: string) => {
    const { model, config } = getModelConfig({ 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    unitTitle: { type: Type.STRING },
                    lessons: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING } } } }
                }
            }
        }
    });
    const prompt = `Generate Saudi official curriculum units and lessons for ${subject}, grade ${grade}, ${term}. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};

export const generateSmartRemedialPlan = async (student: Student, performance: PerformanceRecord[]) => {
    const { model, config } = getModelConfig();
    const prompt = `صمم خطة علاجية مخصصة للطالب ${student.name} بناءً على درجاته: ${JSON.stringify(performance.map(p=>p.score))}. 
    نمط تعلمه: ${student.learningStyle}. بالعربية Markdown.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "تعذر توليد الخطة العلاجية حالياً.";
    } catch { return "خطأ في الاتصال بالسحابة الذكية."; }
};

export const generateParentMessage = async (studentName: string, topic: string, tone: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Write a ${tone} message to the parent of ${studentName} about ${topic}. Arabic. Very polite.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const generateLessonPlan = async (subject: string, topic: string, grade: string, duration: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Create a detailed Saudi lesson plan for ${subject} - ${topic} for ${grade}. Duration: ${duration}min. Arabic Markdown.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const generateQuiz = async (subject: string, topic: string, grade: string, count: number, difficulty: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Generate a quiz for ${topic}.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const suggestQuickActivity = async (topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Suggest a 5-min classroom activity for ${topic}. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const generateBrainstormingIdea = async (topic: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Give me 5 creative brainstorming ideas for students about: ${topic}. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const analyzeClassroomVibe = async (vibeData: { noise: number, mood: string, topic: string }) => {
    const { model, config } = getModelConfig();
    const prompt = `Classroom Vibe: Noise Level ${vibeData.noise}/5, Students Mood: ${vibeData.mood}. Topic: ${vibeData.topic}. 
    Provide 1 quick suggestion to the teacher to improve engagement. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};

export const suggestSeatingPlan = async (stats: any[], criterion: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Analyze students performance and suggest optimal seating grid (5 cols). Criterion: ${criterion}. 
    JSON: {"seating": [{"studentId": "id", "row": 0, "col": 0}]}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return { seating: [] }; }
};

export const diagnoseLearningStyle = async (name: string, obs: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Diagnose student learning style (VARK) for ${name} based on: ${obs}. 
    JSON: {"style": "VISUAL/AUDITORY/READ_WRITE/KINESTHETIC", "reasoning": "Briefly why"}`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return null; }
};

export const analyzeLearningStyleExcel = async (data: string) => {
    const { model, config } = getModelConfig({ responseMimeType: "application/json" });
    const prompt = `Analyze learning styles from this data: ${data}. JSON format.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return JSON.parse(response.text || "{}");
    } catch { return { studentAssignments: [] }; }
};

export const generateRemedialPlan = async (name: string, grade: string, sub: string, weak: string) => {
    const { model, config } = getModelConfig();
    const prompt = `Remedial plan for ${name} in ${sub} for weakness in ${weak}. Arabic.`;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({ model, contents: prompt, config });
        return response.text || "";
    } catch { return ""; }
};
