
import React, { useState, useEffect } from 'react';
import { Teacher, SystemUser } from '../types';
import { getTeachers, updateTeacher } from '../services/storageService';
import { CreditCard, Check, ShieldCheck, Crown, Star, School as SchoolIcon, Loader2, Zap, Rocket } from 'lucide-react';

interface TeacherSubscriptionProps {
    currentUser: SystemUser;
    onProfileUpdate?: () => void;
}

const TeacherSubscription: React.FC<TeacherSubscriptionProps> = ({ currentUser, onProfileUpdate }) => {
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const teachers = getTeachers();
        const me = teachers.find((t: Teacher) => 
            (t.nationalId && t.nationalId === currentUser.nationalId) || 
            (t.email && t.email === currentUser.email)
        );
        setTeacher(me || null);
    }, [currentUser]);

    const handleUpgrade = async (plan: 'FREE' | 'PRO' | 'ENTERPRISE') => {
        if (!teacher) return;
        setLoading(true);
        
        // Mock payment processing delay
        setTimeout(async () => {
            const updatedTeacher: Teacher = {
                ...teacher,
                subscriptionStatus: plan,
                subscriptionEndDate: plan === 'FREE' ? undefined : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
            };
            
            await updateTeacher(updatedTeacher);
            setTeacher(updatedTeacher);
            setLoading(false);
            if(onProfileUpdate) onProfileUpdate();
            alert(`تم تفعيل الباقة بنجاح: ${plan === 'PRO' ? 'المحترف' : 'المجانية'}`);
        }, 1500);
    };

    if (!teacher) return <div className="p-8 text-center text-gray-500 flex flex-col items-center"><Loader2 className="animate-spin mb-2"/> جاري تحميل البيانات...</div>;

    const currentPlan = teacher.subscriptionStatus || 'FREE';

    return (
        <div className="p-6 bg-gray-50 h-full animate-fade-in overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8 pb-10">
                
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">خطط الأسعار</span>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4 mb-2 flex items-center justify-center gap-3">
                        استثمر في أدواتك التعليمية <Rocket className="text-orange-500 animate-pulse-slow"/>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg">اختر الباقة التي تناسب احتياجاتك. ابدأ مجاناً وقم بالترقية للحصول على قوة الذكاء الاصطناعي الكاملة.</p>
                </div>

                {/* Current Plan Status */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-600"></div>
                    <div className="flex items-center gap-4 z-10">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg ${currentPlan === 'PRO' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-500'}`}>
                            {currentPlan === 'PRO' ? <Crown/> : <Star/>}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">باقتك الحالية: <span className={currentPlan === 'PRO' ? "text-indigo-600" : "text-gray-600"}>{currentPlan === 'FREE' ? 'الأساسية (مجاني)' : currentPlan === 'PRO' ? 'المعلم المحترف (PRO)' : 'المؤسسات'}</span></h3>
                            <p className="text-sm text-gray-500 font-medium">
                                {teacher.subscriptionEndDate 
                                    ? `تاريخ التجديد: ${new Date(teacher.subscriptionEndDate).toLocaleDateString('ar-SA')}` 
                                    : 'مفعلة مدى الحياة'}
                            </p>
                        </div>
                    </div>
                    {currentPlan === 'FREE' && (
                        <button onClick={() => document.getElementById('pro-plan')?.scrollIntoView({ behavior: 'smooth' })} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform hover:scale-105 z-10">
                            ترقية الآن - خصم 20%
                        </button>
                    )}
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    
                    {/* Free Plan */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-8 flex flex-col hover:shadow-xl transition-all relative overflow-hidden group">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">الباقة الأساسية</h3>
                        <p className="text-xs text-gray-400 mb-6 font-medium">للمعلمين المبتدئين</p>
                        <div className="text-4xl font-black text-gray-900 mb-6">0 <span className="text-sm font-normal text-gray-500">ر.س / شهر</span></div>
                        
                        <div className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-green-100 rounded-full text-green-600"><Check size={12}/></div> إدارة فصل واحد</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-green-100 rounded-full text-green-600"><Check size={12}/></div> سجل رصد الدرجات</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-green-100 rounded-full text-green-600"><Check size={12}/></div> 50 طالب كحد أقصى</li>
                            <li className="flex items-center gap-3 text-sm text-gray-400 line-through decoration-gray-300"><div className="p-1 bg-gray-100 rounded-full text-gray-400"><Check size={12}/></div> أدوات الذكاء الاصطناعي</li>
                        </div>
                        
                        <button 
                            disabled={currentPlan === 'FREE'}
                            onClick={() => handleUpgrade('FREE')}
                            className={`w-full py-3.5 rounded-xl font-bold border transition-colors ${currentPlan === 'FREE' ? 'bg-gray-100 text-gray-400 cursor-default' : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}
                        >
                            {currentPlan === 'FREE' ? 'باقتك الحالية' : 'العودة للمجانية'}
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div id="pro-plan" className="bg-gray-900 rounded-3xl border-2 border-indigo-500 p-8 flex flex-col shadow-2xl relative transform md:-translate-y-6 md:hover:-translate-y-8 transition-transform duration-300">
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase tracking-wider">Most Popular</div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                        
                        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Crown size={24} className="text-yellow-400 fill-yellow-400"/> المحترف (PRO)</h3>
                        <p className="text-xs text-gray-400 mb-6 font-medium">كل ما تحتاجه للتميز</p>
                        
                        <div className="text-5xl font-black text-white mb-1">29 <span className="text-sm font-normal text-gray-400">ر.س</span></div>
                        <p className="text-gray-500 text-xs mb-8">تدفع شهرياً (يمكن الإلغاء في أي وقت)</p>
                        
                        <div className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-gray-200"><div className="p-1 bg-indigo-500 rounded-full text-white"><Check size={12}/></div> <b>عدد غير محدود</b> من الطلاب والفصول</li>
                            <li className="flex items-center gap-3 text-sm text-gray-200"><div className="p-1 bg-indigo-500 rounded-full text-white"><Check size={12}/></div> <b>الذكاء الاصطناعي (Gemini)</b>: تحضير، اختبارات</li>
                            <li className="flex items-center gap-3 text-sm text-gray-200"><div className="p-1 bg-indigo-500 rounded-full text-white"><Check size={12}/></div> تحليل الأداء والتقارير الذكية</li>
                            <li className="flex items-center gap-3 text-sm text-gray-200"><div className="p-1 bg-indigo-500 rounded-full text-white"><Check size={12}/></div> التزامن السحابي الفوري</li>
                            <li className="flex items-center gap-3 text-sm text-gray-200"><div className="p-1 bg-indigo-500 rounded-full text-white"><Check size={12}/></div> دعم فني مميز (WhatsApp)</li>
                        </div>
                        
                        <button 
                            onClick={() => handleUpgrade('PRO')}
                            disabled={loading || currentPlan === 'PRO'}
                            className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 ${currentPlan === 'PRO' ? 'bg-green-600 text-white cursor-default' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/30 hover:scale-[1.02]'}`}
                        >
                            {loading ? <Loader2 className="animate-spin"/> : <Zap size={18} fill="currentColor"/>}
                            {currentPlan === 'PRO' ? 'مشترك حالياً' : 'اشترك الآن - تجربة مجانية'}
                        </button>
                        <p className="text-[10px] text-gray-500 text-center mt-3">ضمان استرداد الأموال خلال 14 يوماً</p>
                    </div>

                    {/* School Plan */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-8 flex flex-col hover:shadow-xl transition-all">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2"><SchoolIcon size={20} className="text-teal-600"/> المدارس</h3>
                        <p className="text-xs text-gray-400 mb-6 font-medium">حلول متكاملة للإدارة</p>
                        <div className="text-3xl font-black text-gray-900 mb-6 py-2">تواصل معنا</div>
                        
                        <div className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-teal-100 rounded-full text-teal-600"><Check size={12}/></div> حسابات لجميع المعلمين (PRO)</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-teal-100 rounded-full text-teal-600"><Check size={12}/></div> لوحة تحكم للإدارة والإشراف</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-teal-100 rounded-full text-teal-600"><Check size={12}/></div> تقارير أداء شاملة للمدرسة</li>
                            <li className="flex items-center gap-3 text-sm text-gray-600"><div className="p-1 bg-teal-100 rounded-full text-teal-600"><Check size={12}/></div> تدريب ودعم خاص</li>
                        </div>
                        
                        <button className="w-full py-3.5 rounded-xl font-bold border border-teal-600 text-teal-700 hover:bg-teal-50 transition-colors">
                            طلب عرض سعر للمدارس
                        </button>
                    </div>

                </div>

                <div className="flex justify-center pt-8">
                    <div className="bg-white px-6 py-4 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 text-sm text-gray-500">
                        <ShieldCheck size={18} className="text-green-600"/>
                        جميع المدفوعات آمنة ومشفرة 100% عبر Stripe
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherSubscription;
