
import React, { useState, useEffect } from 'react';
import { Teacher, SystemUser } from '../types';
import { getTeachers, updateTeacher } from '../services/storageService';
import { CreditCard, Check, ShieldCheck, Crown, Star, School as SchoolIcon, Loader2 } from 'lucide-react';

interface TeacherSubscriptionProps {
    currentUser: SystemUser;
    onProfileUpdate?: () => void;
}

const TeacherSubscription: React.FC<TeacherSubscriptionProps> = ({ currentUser, onProfileUpdate }) => {
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const teachers = getTeachers();
        const me = teachers.find(t => 
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
            alert(`تم ترقية الباقة بنجاح إلى: ${plan}`);
        }, 1500);
    };

    if (!teacher) return <div className="p-8 text-center text-gray-500">جاري تحميل بيانات الاشتراك...</div>;

    const currentPlan = teacher.subscriptionStatus || 'FREE';

    return (
        <div className="p-6 bg-gray-50 h-full animate-fade-in overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-gray-800 mb-2 flex items-center justify-center gap-2">
                        <CreditCard className="text-teal-600"/> إدارة الاشتراك
                    </h2>
                    <p className="text-gray-500">اختر الباقة المناسبة لاحتياجاتك التعليمية</p>
                </div>

                {/* Current Plan Banner */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl shadow-lg ${currentPlan === 'PRO' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-400'}`}>
                            {currentPlan === 'PRO' ? <Crown/> : <Star/>}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">باقتك الحالية: <span className="text-teal-600">{currentPlan === 'FREE' ? 'المجانية' : currentPlan === 'PRO' ? 'المحترفين (Pro)' : 'المؤسسات'}</span></h3>
                            <p className="text-sm text-gray-500">
                                {teacher.subscriptionEndDate 
                                    ? `تنتهي في: ${new Date(teacher.subscriptionEndDate).toLocaleDateString('ar-SA')}` 
                                    : 'باقة مجانية مدى الحياة'}
                            </p>
                        </div>
                    </div>
                    {currentPlan === 'FREE' && (
                        <button onClick={() => document.getElementById('pro-plan')?.scrollIntoView({ behavior: 'smooth' })} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 shadow-md transition-transform hover:scale-105">
                            ترقية الآن ⚡
                        </button>
                    )}
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Free Plan */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col hover:shadow-lg transition-all relative overflow-hidden">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">الباقة الأساسية</h3>
                        <div className="text-4xl font-black text-gray-900 mb-6">0 <span className="text-sm font-normal text-gray-500">ر.س / شهر</span></div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-green-500"/> إدارة الفصول والطلاب</li>
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-green-500"/> رصد الدرجات والحضور</li>
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-green-500"/> 50 طالب كحد أقصى</li>
                            <li className="flex items-center gap-2 text-sm text-gray-400 line-through"><Check size={16} className="text-gray-300"/> أدوات الذكاء الاصطناعي</li>
                        </ul>
                        <button 
                            disabled={currentPlan === 'FREE'}
                            onClick={() => handleUpgrade('FREE')}
                            className={`w-full py-3 rounded-xl font-bold border transition-colors ${currentPlan === 'FREE' ? 'bg-gray-100 text-gray-400 cursor-default' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            {currentPlan === 'FREE' ? 'باقتك الحالية' : 'تحويل للمجانية'}
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div id="pro-plan" className="bg-gray-900 rounded-2xl border-2 border-teal-500 p-6 flex flex-col shadow-2xl relative transform md:-translate-y-4">
                        <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">الأكثر طلباً</div>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Crown size={20} className="text-yellow-400"/> المعلم المحترف</h3>
                        <div className="text-4xl font-black text-white mb-6">29 <span className="text-sm font-normal text-gray-400">ر.س / شهر</span></div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-teal-400"/> <b>عدد غير محدود</b> من الطلاب</li>
                            <li className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-teal-400"/> <b>الذكاء الاصطناعي (AI)</b>: تحضير، اختبارات، تقارير</li>
                            <li className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-teal-400"/> المزامنة السحابية الفورية</li>
                            <li className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-teal-400"/> دعم فني مميز</li>
                        </ul>
                        <button 
                            onClick={() => handleUpgrade('PRO')}
                            disabled={loading || currentPlan === 'PRO'}
                            className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 ${currentPlan === 'PRO' ? 'bg-green-600 text-white cursor-default' : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:shadow-teal-500/50 hover:scale-[1.02]'}`}
                        >
                            {loading ? <Loader2 className="animate-spin"/> : null}
                            {currentPlan === 'PRO' ? 'مشترك حالياً' : 'اشترك الآن'}
                        </button>
                    </div>

                    {/* School Plan */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col hover:shadow-lg transition-all">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2"><SchoolIcon size={20} className="text-purple-600"/> باقة المدارس</h3>
                        <div className="text-2xl font-black text-gray-900 mb-6 py-2">تواصل معنا</div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-purple-500"/> حسابات لجميع المعلمين</li>
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-purple-500"/> لوحة تحكم للإدارة</li>
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-purple-500"/> تقارير إشرافية شاملة</li>
                            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-purple-500"/> تدريب ودعم خاص</li>
                        </ul>
                        <button className="w-full py-3 rounded-xl font-bold border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors">
                            طلب عرض سعر
                        </button>
                    </div>

                </div>

                <div className="flex justify-center mt-8">
                    <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex items-center gap-3 border border-blue-100 max-w-2xl">
                        <ShieldCheck size={24} className="shrink-0"/>
                        <p>جميع العمليات آمنة ومشفرة. يمكنك إلغاء الاشتراك في أي وقت. ضمان استرداد الأموال خلال 14 يوماً.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherSubscription;
