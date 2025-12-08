import React from 'react';
import { ScanLine, Construction } from 'lucide-react';

const AutoGrading: React.FC = () => {
    return (
        <div className="p-10 h-full flex flex-col items-center justify-center bg-gray-50 animate-fade-in text-center">
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-200 max-w-lg w-full flex flex-col items-center">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 text-purple-600">
                    <ScanLine size={40}/>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">التصحيح الآلي (قريباً)</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    هذه الميزة قيد التطوير. ستمكنك قريباً من تصحيح أوراق الإجابة تلقائياً عبر الكاميرا أو رفع الصور، وربط الدرجات مباشرة بسجل المتابعة.
                </p>
                <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-full font-bold">
                    <Construction size={16}/> جاري العمل عليها
                </div>
            </div>
        </div>
    );
};

export default AutoGrading;