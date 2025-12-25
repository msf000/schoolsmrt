
import React, { useState } from 'react';
import { Student, LearningStyle } from '../types';
import { updateStudentLearningStyle } from '../services/storageService';
import { 
    BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, Sparkles, BookOpen, Music, Image as ImageIcon, Activity,
    Star, Info
} from 'lucide-react';

const VARK_QUESTIONS = [
    { id: 1, question: "عندما أتعلم كيفية استخدام برنامج جديد، فإني أفضل:", options: [
        { text: "مشاهدة فيديو توضيحي للواجهة", style: "VISUAL" },
        { text: "الاستماع لشرح من شخص خبير", style: "AUDITORY" },
        { text: "قراءة دليل التعليمات المكتوب", style: "READ_WRITE" },
        { text: "البدء بتجربة الأزرار بنفسي", style: "KINESTHETIC" }
    ]},
    { id: 2, question: "عندما أصف مكاناً لشخص آخر، فإني:", options: [
        { text: "أرسم له كروكي أو خريطة", style: "VISUAL" },
        { text: "أشرح له الاتجاهات شفهياً", style: "AUDITORY" },
        { text: "أكتب له العنوان والخطوات بدقة", style: "READ_WRITE" },
        { text: "أرافقه للمكان أو أمثل له الحركة", style: "KINESTHETIC" }
    ]},
    { id: 3, question: "في وقت الفراغ، أفضل غالباً:", options: [
        { text: "مشاهدة فيلم أو تصفح الصور", style: "VISUAL" },
        { text: "الاستماع للموسيقى أو بودكاست", style: "AUDITORY" },
        { text: "قراءة كتاب أو كتابة يومياتي", style: "READ_WRITE" },
        { text: "ممارسة الرياضة أو عمل يدوي", style: "KINESTHETIC" }
    ]},
    { id: 4, question: "أفضل المعلم الذي يستخدم في شرحه:", options: [
        { text: "الرسوم والخرائط الذهنية", style: "VISUAL" },
        { text: "النقاشات الجماعية والأمثلة الصوتية", style: "AUDITORY" },
        { text: "المذكرات والقوائم المنظمة", style: "READ_WRITE" },
        { text: "التجارب العملية والنماذج الملموسة", style: "KINESTHETIC" }
    ]},
    { id: 5, question: "عندما أستعد لاختبار، فإني:", options: [
        { text: "أتذكر شكل الصفحة ومكان المعلومات", style: "VISUAL" },
        { text: "أسمع لنفسي بصوت عالٍ أو أناقش زملائي", style: "AUDITORY" },
        { text: "أكتب ملخصات وجداول للمراجعة", style: "READ_WRITE" },
        { text: "أقوم بحل تدريبات عملية كثيرة", style: "KINESTHETIC" }
    ]},
    { id: 6, question: "إذا اشتريت جهازاً جديداً يحتاج تركيباً:", options: [
        { text: "أنظر للرسوم التوضيحية المرفقة", style: "VISUAL" },
        { text: "أتصل بشخص ليشرح لي هاتفياً", style: "AUDITORY" },
        { text: "أقرأ كتيب التركيب بدقة", style: "READ_WRITE" },
        { text: "أبدأ بالتركيب مباشرة معتمداً على حسي", style: "KINESTHETIC" }
    ]},
    { id: 7, question: "أتذكر الأشخاص غالباً من خلال:", options: [
        { text: "ملامح وجوههم وشكل ملابسهم", style: "VISUAL" },
        { text: "نبرة أصواتهم وما قالوه", style: "AUDITORY" },
        { text: "أسماؤهم المكتوبة أو تفاصيل سيرتهم", style: "READ_WRITE" },
        { text: "طريقة حركتهم أو شعوري تجاههم", style: "KINESTHETIC" }
    ]},
    { id: 8, question: "عندما أشعر بالملل في الفصل، فإني غالباً:", options: [
        { text: "أسرح في الخيال أو أرسم على الهامش", style: "VISUAL" },
        { text: "أبدأ بالهمس أو التحدث مع جاري", style: "AUDITORY" },
        { text: "أقرأ في الكتاب أو أكتب ملاحظات عشوائية", style: "READ_WRITE" },
        { text: "أهز قدمي أو أعبث بالأقلام", style: "KINESTHETIC" }
    ]}
];

interface Props {
    student: Student;
    onComplete: () => void;
}

const StudentLearningTest: React.FC<Props> = ({ student, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [result, setResult] = useState<LearningStyle | null>(null);

    const handleSelect = (style: string) => {
        setAnswers({ ...answers, [VARK_QUESTIONS[currentStep].id]: style });
    };

    const calculateResult = () => {
        const counts: Record<string, number> = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0 };
        Object.values(answers).forEach((style: any) => {
            counts[style as string]++;
        });

        let dominantStyle: LearningStyle = 'UNKNOWN';
        let max = 0;
        Object.entries(counts).forEach(([style, count]) => {
            if (count > max) {
                max = count;
                dominantStyle = style as LearningStyle;
            }
        });

        setResult(dominantStyle);
        updateStudentLearningStyle(student.id, dominantStyle);
        setIsFinished(true);
    };

    if (isFinished) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl text-center animate-zoom-in border-4 border-indigo-50">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">اكتمل الاختبار!</h2>
                <p className="text-gray-500 mb-8 font-bold">بناءً على إجاباتك، قمنا بتحديد نمطك التعليمي.</p>
                
                <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[2rem] border-2 border-indigo-100 mb-8 relative overflow-hidden">
                    <Sparkles className="absolute top-2 right-2 text-yellow-400 opacity-40"/>
                    <p className="text-indigo-600 font-black mb-2 uppercase tracking-widest text-xs">نمطك المفضل هو:</p>
                    <h3 className="text-4xl font-black text-indigo-900 mb-6">
                        {result === 'VISUAL' ? 'النمط البصري 👁️' : 
                         result === 'AUDITORY' ? 'النمط السمعي 👂' : 
                         result === 'READ_WRITE' ? 'النمط القرائي 📖' : 'النمط الحركي 🏃'}
                    </h3>
                    
                    <div className="text-right space-y-4">
                        <h4 className="font-black text-indigo-700 flex items-center gap-2"><Star size={16}/> كيف تذاكر بذكاء؟</h4>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc pr-5 font-medium leading-relaxed">
                            {result === 'VISUAL' && (
                                <>
                                    <li>استخدم الألوان المفسفرة لتظليل النقاط الهامة.</li>
                                    <li>حول دروسك إلى خرائط ذهنية ورسوم توضيحية.</li>
                                    <li>شاهد فيديوهات تعليمية للمواضيع المعقدة.</li>
                                </>
                            )}
                            {result === 'AUDITORY' && (
                                <>
                                    <li>اقرأ ملخصاتك بصوت عالٍ أو سجلها واستمع لها.</li>
                                    <li>اشرح ما تعلمته لزملائك أو عائلتك.</li>
                                    <li>شارك بفعالية في النقاشات الصفية.</li>
                                </>
                            )}
                            {result === 'READ_WRITE' && (
                                <>
                                    <li>دون الملاحظات يدوياً أثناء المذاكرة.</li>
                                    <li>حول الجداول والرسوم إلى نصوص وقوائم مرقمة.</li>
                                    <li>اقرأ الكتب والمراجع الإضافية للموضوع.</li>
                                </>
                            )}
                            {result === 'KINESTHETIC' && (
                                <>
                                    <li>ذاكر لفترات قصيرة مع التحرك بينها.</li>
                                    <li>استخدم أدوات ملموسة أو قم بتمثيل الأدوار في الدروس.</li>
                                    <li>قم بحل الكثير من النماذج والاختبارات العملية.</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <button onClick={onComplete} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all scale-105 active:scale-95">العودة للوحة المعلومات</button>
            </div>
        );
    }

    const currentQ = VARK_QUESTIONS[currentStep];
    const progress = ((currentStep + 1) / VARK_QUESTIONS.length) * 100;

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><BrainCircuit/></div>
                    <div>
                        <h2 className="font-black text-gray-800">اكتشف أسرار تعلمك</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">اختبار VARK العالمي للطلاب</p>
                    </div>
                </div>
                <div className="text-left font-black text-indigo-600">{currentStep + 1} / {VARK_QUESTIONS.length}</div>
            </div>

            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><HelpCircle size={150}/></div>
                <h3 className="text-2xl font-black text-gray-800 mb-10 leading-relaxed text-center relative z-10">
                    {currentQ.question}
                </h3>

                <div className="grid grid-cols-1 gap-4 relative z-10">
                    {currentQ.options.map((opt, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSelect(opt.style)}
                            className={`p-6 rounded-2xl border-2 text-right font-bold transition-all flex items-center justify-between group ${
                                answers[currentQ.id] === opt.style 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.03]' 
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-200 hover:bg-white'
                            }`}
                        >
                            <span>{opt.text}</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${answers[currentQ.id] === opt.style ? 'border-white bg-indigo-500' : 'border-gray-300'}`}>
                                {answers[currentQ.id] === opt.style && <div className="w-3 h-3 bg-white rounded-full animate-zoom-in"></div>}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-12 flex justify-between items-center relative z-10 border-t pt-8">
                    <button 
                        disabled={currentStep === 0}
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="flex items-center gap-2 text-gray-400 font-black disabled:opacity-0 hover:text-gray-600 transition-colors"
                    >
                        <ChevronRight size={20}/> السابق
                    </button>
                    
                    <div className="flex gap-4">
                         <button 
                            disabled={!answers[currentQ.id]}
                            onClick={() => {
                                if (currentStep < VARK_QUESTIONS.length - 1) setCurrentStep(currentStep + 1);
                                else calculateResult();
                            }}
                            className="bg-gray-900 text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-2 shadow-xl disabled:opacity-50 hover:bg-black transition-all active:scale-95"
                        >
                            {currentStep === VARK_QUESTIONS.length - 1 ? 'إرسال وتحليل' : 'السؤال التالي'} <ChevronLeft size={20}/>
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info className="text-blue-500 shrink-0" size={18}/>
                <p className="text-[10px] text-blue-800 font-bold leading-relaxed">بإكمال هذا الاختبار، ستتمكن من مساعدة معلميك على فهم الطريقة الأفضل لشرح الدروس لك، كما ستحصل على نصائح مذاكرة مخصصة لنمطك الشخصي.</p>
            </div>
        </div>
    );
};

export default StudentLearningTest;
