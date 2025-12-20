import React, { useState } from 'react';
import { Student, LearningStyle } from '../types';
import { updateStudentLearningStyle } from '../services/storageService';
import { BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';

const VARK_QUESTIONS = [
    {
        id: 1,
        question: "عندما أتعلم كيفية استخدام برنامج جديد على الكمبيوتر، فإني أفضل:",
        options: [
            { text: "مشاهدة فيديو توضيحي لواجهة البرنامج", style: "VISUAL" },
            { text: "الاستماع لشرح من شخص خبير", style: "AUDITORY" },
            { text: "قراءة دليل التعليمات المكتوب", style: "READ_WRITE" },
            { text: "البدء بتجربة الأزرار واكتشاف البرنامج بنفسي", style: "KINESTHETIC" }
        ]
    },
    {
        id: 2,
        question: "إذا أردت الذهاب إلى مطعم جديد، فإني أفضل:",
        options: [
            { text: "النظر إلى صور الأطباق والديكور في التطبيق", style: "VISUAL" },
            { text: "سؤال صديق عن تجربته وسماع رأيه", style: "AUDITORY" },
            { text: "قراءة قائمة الطعام والتقييمات المكتوبة", style: "READ_WRITE" },
            { text: "الذهاب للمطعم فوراً وتجربة الأكل بنفسي", style: "KINESTHETIC" }
        ]
    },
    {
        id: 3,
        question: "عندما أخطط لقضاء عطلة، فإني أفضل:",
        options: [
            { text: "مشاهدة خرائط سياحية وصور للمكان", style: "VISUAL" },
            { text: "مناقشة خطة الرحلة مع العائلة أو الأصدقاء", style: "AUDITORY" },
            { text: "قراءة كتيبات سياحية وبرامج الرحلات المكتوبة", style: "READ_WRITE" },
            { text: "البحث عن الأنشطة الحركية والرياضية التي سأقوم بها", style: "KINESTHETIC" }
        ]
    },
    {
        id: 4,
        question: "أفضل المعلم الذي يستخدم في شرحه:",
        options: [
            { text: "الرسوم التوضيحية والألوان والخرائط الذهنية", style: "VISUAL" },
            { text: "النقاشات الجماعية والأمثلة الصوتية", style: "AUDITORY" },
            { text: "المذكرات المكتوبة والقوائم المنظمة", style: "READ_WRITE" },
            { text: "التجارب العملية والنماذج التي يمكن لمسها", style: "KINESTHETIC" }
        ]
    }
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

    const next = () => {
        if (currentStep < VARK_QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            calculateResult();
        }
    };

    const calculateResult = () => {
        const counts: any = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0 };
        Object.values(answers).forEach(style => {
            // Fix: Cast style to string to prevent index type error
            counts[style as string]++;
        });

        let dominantStyle: LearningStyle = 'UNKNOWN';
        let max = 0;
        Object.entries(counts).forEach(([style, count]: [any, any]) => {
            if (count > max) {
                max = count;
                dominantStyle = style;
            }
        });

        setResult(dominantStyle);
        updateStudentLearningStyle(student.id, dominantStyle);
        setIsFinished(true);
    };

    if (isFinished) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl text-center animate-zoom-in">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">أحسنت يا بطل!</h2>
                <p className="text-gray-500 mb-8">لقد قمنا بتحليل إجاباتك بنجاح.</p>
                
                <div className="bg-indigo-50 p-8 rounded-[2rem] border-2 border-indigo-100 mb-8">
                    <p className="text-indigo-600 font-bold mb-2 uppercase tracking-widest text-xs">نمط تعلمك هو:</p>
                    <h3 className="text-4xl font-black text-indigo-900 mb-4">
                        {result === 'VISUAL' ? 'النمط البصري 👁️' : 
                         result === 'AUDITORY' ? 'النمط السمعي 👂' : 
                         result === 'READ_WRITE' ? 'النمط القرائي 📖' : 'النمط الحركي 🏃'}
                    </h3>
                    <p className="text-sm text-indigo-700 leading-relaxed">
                        {result === 'VISUAL' && 'أنت تتعلم بشكل أفضل عندما ترى المعلومات في صور وخرائط ألوان.'}
                        {result === 'AUDITORY' && 'أنت تستوعب المعلومات بشكل أسرع من خلال الاستماع والنقاش.'}
                        {result === 'READ_WRITE' && 'أنت تفضل تدوين الملاحظات وقراءة الكتب لتثبيت المعلومة.'}
                        {result === 'KINESTHETIC' && 'أنت تتعلم بشكل فعال من خلال الممارسة اليدوية والتجارب الحركية.'}
                    </p>
                </div>

                <button onClick={onComplete} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">العودة للرئيسية</button>
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
                        <h2 className="font-black text-gray-800">اكتشف نمط تعلمك</h2>
                        <p className="text-xs text-gray-400">أجب بصدق لتعرف الطريقة الأمثل للمذاكرة</p>
                    </div>
                </div>
                <div className="text-left">
                    <span className="text-sm font-black text-indigo-600">{currentStep + 1} / {VARK_QUESTIONS.length}</span>
                </div>
            </div>

            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border shadow-xl">
                <h3 className="text-2xl font-black text-gray-800 mb-10 leading-relaxed text-center">
                    {currentQ.question}
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {currentQ.options.map((opt, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSelect(opt.style)}
                            className={`p-6 rounded-2xl border-2 text-right font-bold transition-all flex items-center justify-between group ${
                                answers[currentQ.id] === opt.style 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]' 
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-200'
                            }`}
                        >
                            <span>{opt.text}</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQ.id] === opt.style ? 'border-white' : 'border-gray-300'}`}>
                                {answers[currentQ.id] === opt.style && <div className="w-3 h-3 bg-white rounded-full"></div>}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-12 flex justify-between">
                    <button 
                        disabled={currentStep === 0}
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="flex items-center gap-2 text-gray-400 font-bold disabled:opacity-0"
                    >
                        <ChevronRight size={20}/> السابق
                    </button>
                    <button 
                        disabled={!answers[currentQ.id]}
                        onClick={next}
                        className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg disabled:opacity-50 hover:bg-black transition-all"
                    >
                        {currentStep === VARK_QUESTIONS.length - 1 ? 'إنهاء الاختبار' : 'السؤال التالي'} <ChevronLeft size={20}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentLearningTest;