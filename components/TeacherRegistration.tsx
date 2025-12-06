
import React, { useState, useEffect } from 'react';
import { Teacher, School } from '../types';
import { addTeacher, getTeachers, getSchools, addSchool } from '../services/storageService';
import { User, Mail, Phone, Lock, BookOpen, ShieldCheck, School as SchoolIcon, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface TeacherRegistrationProps {
    onBack: () => void;
    onRegisterSuccess: (email: string, pass: string) => void;
}

const TeacherRegistration: React.FC<TeacherRegistrationProps> = ({ onBack, onRegisterSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        nationalId: '',
        email: '',
        phone: '',
        specialty: '',
        password: '',
        confirmPassword: '',
        schoolCode: '',       // Ministry Code
        schoolName: '',       // New School Name
        managerName: '',      // New Manager Name
        managerNationalId: '' // New Manager ID
    });
    
    const [foundSchool, setFoundSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (formData.schoolCode.length >= 3) {
            const schools = getSchools();
            const match = schools.find(s => s.ministryCode === formData.schoolCode);
            setFoundSchool(match || null);
        } else {
            setFoundSchool(null);
        }
    }, [formData.schoolCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('كلمات المرور غير متطابقة.');
            setLoading(false);
            return;
        }
        if (formData.nationalId.length < 10) {
            setError('رقم الهوية يجب أن يكون 10 أرقام على الأقل.');
            setLoading(false);
            return;
        }

        const teachers = getTeachers();
        const exists = teachers.find(t => t.nationalId === formData.nationalId || t.email === formData.email);
        if (exists) {
            setError('رقم الهوية أو البريد الإلكتروني مسجل مسبقاً.');
            setLoading(false);
            return;
        }

        try {
            let schoolId = undefined;
            let managerId = undefined;

            if (formData.schoolCode) {
                if (foundSchool) {
                    schoolId = foundSchool.id;
                    managerId = foundSchool.managerNationalId;
                } else {
                    if (!formData.schoolName || !formData.managerName || !formData.managerNationalId) {
                        setError('الرمز الوزاري جديد. يجب تعبئة بيانات المدرسة والمدير كاملة لإنشائها.');
                        setLoading(false);
                        return;
                    }

                    const newSchool: School = {
                        id: Date.now().toString() + '_sch',
                        name: formData.schoolName,
                        ministryCode: formData.schoolCode,
                        managerName: formData.managerName,
                        managerNationalId: formData.managerNationalId,
                        type: 'PUBLIC',
                        phone: '',
                        studentCount: 0,
                        subscriptionStatus: 'TRIAL'
                    };
                    
                    // Await cloud save
                    await addSchool(newSchool);
                    schoolId = newSchool.id;
                    managerId = formData.managerNationalId;
                }
            }

            const newTeacher: Teacher = {
                id: Date.now().toString(),
                name: formData.name,
                nationalId: formData.nationalId,
                email: formData.email,
                phone: formData.phone,
                subjectSpecialty: formData.specialty,
                password: formData.password,
                schoolId: schoolId,
                managerId: managerId
            };

            // Await cloud save (which also adds to system_users)
            await addTeacher(newTeacher);
            
            setSuccess(true);
            setTimeout(() => {
                onRegisterSuccess(formData.nationalId, formData.password);
            }, 1500);
        } catch (e: any) {
            console.error(e);
            // Display specific error message from storageService
            setError(e.message || 'حدث خطأ أثناء الحفظ في قاعدة البيانات. تحقق من الاتصال.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-fade-in border border-green-100">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">تم التسجيل بنجاح!</h2>
                    <p className="text-gray-500">جاري توجيهك إلى النظام...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4 py-10" dir="rtl">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in flex flex-col md:flex-row">
                
                {/* Side Banner */}
                <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-10 -mb-10"></div>
                    
                    <div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <BookOpen size={24}/>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">انضم إلينا</h2>
                        <p className="text-teal-100 text-sm leading-relaxed">
                            سجل حسابك كمعلم وابدأ في إدارة فصولك، رصد الدرجات، واستخدام أدوات الذكاء الاصطناعي لتسهيل عملك اليومي.
                        </p>
                    </div>
                    
                    <button onClick={onBack} className="mt-8 flex items-center gap-2 text-sm text-teal-100 hover:text-white transition-colors w-fit">
                        <ArrowRight size={16}/> العودة للدخول
                    </button>
                </div>

                {/* Form */}
                <div className="p-8 md:w-2/3">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <User className="text-teal-600"/> تسجيل معلم جديد
                    </h2>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                            <AlertCircle size={16}/> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Personal Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل *</label>
                                <div className="relative">
                                    <User size={16} className="absolute top-2.5 right-3 text-gray-400"/>
                                    <input required name="name" value={formData.name} onChange={handleChange} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" placeholder="الاسم الرباعي"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهوية / السجل *</label>
                                <div className="relative">
                                    <ShieldCheck size={16} className="absolute top-2.5 right-3 text-gray-400"/>
                                    <input required name="nationalId" value={formData.nationalId} onChange={handleChange} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm font-mono" placeholder="10xxxxxxxx"/>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute top-2.5 right-3 text-gray-400"/>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm dir-ltr text-right" placeholder="example@school.com"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الجوال</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute top-2.5 right-3 text-gray-400"/>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm font-mono" placeholder="05xxxxxxxx"/>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">التخصص</label>
                            <input 
                                type="text" 
                                name="specialty" 
                                value={formData.specialty} 
                                onChange={handleChange} 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
                                placeholder="مثال: لغة عربية، رياضيات، علوم..."
                            />
                        </div>

                        {/* School Section */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                <SchoolIcon size={14}/> بيانات المدرسة (للربط)
                            </label>
                            
                            <div className="mb-3">
                                <input 
                                    name="schoolCode" 
                                    value={formData.schoolCode} 
                                    onChange={handleChange} 
                                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm font-mono tracking-widest text-center uppercase ${foundSchool ? 'border-green-400 bg-green-50' : ''}`}
                                    placeholder="أدخل الرمز الوزاري هنا"
                                />
                            </div>

                            {foundSchool ? (
                                <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm animate-fade-in">
                                    <div className="flex items-center gap-2 mb-1 text-green-700 font-bold text-sm">
                                        <CheckCircle size={16}/> تم العثور على المدرسة
                                    </div>
                                    <div className="text-xs text-gray-600 grid grid-cols-2 gap-2 mt-2">
                                        <div className="bg-gray-50 p-2 rounded border">
                                            <span className="block text-gray-400 text-[10px]">المدرسة</span>
                                            <span className="font-bold">{foundSchool.name}</span>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded border">
                                            <span className="block text-gray-400 text-[10px]">المدير</span>
                                            <span className="font-bold">{foundSchool.managerName}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-teal-600 mt-2 text-center">سيتم ربط حسابك بهذه المدرسة تلقائياً.</p>
                                </div>
                            ) : formData.schoolCode.length >= 3 ? (
                                <div className="animate-fade-in space-y-3 pt-2 border-t border-gray-200 mt-2">
                                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                                        <AlertCircle size={14}/> مدرسة جديدة؟ يرجى إكمال البيانات:
                                    </div>
                                    <input 
                                        name="schoolName" 
                                        value={formData.schoolName} 
                                        onChange={handleChange} 
                                        className="w-full p-2 border rounded-lg text-sm bg-white" 
                                        placeholder="اسم المدرسة *"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input 
                                            name="managerName" 
                                            value={formData.managerName} 
                                            onChange={handleChange} 
                                            className="w-full p-2 border rounded-lg text-sm bg-white" 
                                            placeholder="اسم مدير المدرسة *"
                                        />
                                        <input 
                                            name="managerNationalId" 
                                            value={formData.managerNationalId} 
                                            onChange={handleChange} 
                                            className="w-full p-2 border rounded-lg text-sm bg-white font-mono" 
                                            placeholder="هوية المدير *"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-gray-400 text-center">أدخل الرمز الوزاري للبحث عن المدرسة أو إضافتها.</p>
                            )}
                        </div>

                        {/* Password Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">كلمة المرور *</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute top-2.5 right-3 text-gray-400"/>
                                    <input type="password" required name="password" value={formData.password} onChange={handleChange} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" placeholder="••••••••"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">تأكيد كلمة المرور *</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute top-2.5 right-3 text-gray-400"/>
                                    <input type="password" required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" placeholder="••••••••"/>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'إنشاء الحساب'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TeacherRegistration;
