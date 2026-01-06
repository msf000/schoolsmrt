
import React, { useState, useEffect } from 'react';
import { Teacher, School, SystemUser } from '../types';
import { addTeacher, getTeachers, getSchools, addSchool, addSystemUser, fetchSchools, fetchSystemUsers } from '../services/storageService';
import { User, Mail, Phone, Lock, BookOpen, ShieldCheck, School as SchoolIcon, ArrowRight, CheckCircle, Loader2, AlertCircle, Info, MapPin, Building, RefreshCw } from 'lucide-react';

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
        managerNationalId: '', // New Manager ID
        educationAdmin: '',   // New: Education Administration
        schoolType: 'PUBLIC'  // New: School Type
    });
    
    const [foundSchool, setFoundSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // جلب البيانات السحابية فور تحميل المكون لضمان معرفة المدارس المسجلة
    useEffect(() => {
        const syncData = async () => {
            setIsSyncing(true);
            try {
                await Promise.all([fetchSchools(), fetchSystemUsers()]);
            } catch (e) {
                console.error("Registration Sync Error:", e);
            } finally {
                setIsSyncing(false);
            }
        };
        syncData();
    }, []);

    useEffect(() => {
        if (formData.schoolCode.length >= 3) {
            const schools = getSchools();
            const match = schools.find((s: School) => s.ministryCode === formData.schoolCode);
            setFoundSchool(match || null);
        } else {
            setFoundSchool(null);
        }
    }, [formData.schoolCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    // Helper to attempt saving school with fallback
    const tryAddSchool = async (school: School) => {
        try {
            await addSchool(school);
            return school.id;
        } catch (e: any) {
            // Smart Retry: If error implies missing columns, try saving without optional manager fields
            if (e.message && (e.message.includes('column') || e.message.includes('manager_national_id'))) {
                console.warn("Schema mismatch detected, retrying with basic school data...");
                // Create a clean object without the problematic fields
                const { managerNationalId, managerName, ministryCode, ...basicSchoolData } = school;
                
                await addSchool(basicSchoolData as School);
                return basicSchoolData.id;
            }
            throw e;
        }
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
        const exists = teachers.find((t: Teacher) => t.nationalId === formData.nationalId || t.email === formData.email);
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
                    // New School Logic
                    if (!formData.schoolName) {
                        setError('الرمز الوزاري جديد. الرجاء كتابة اسم المدرسة لإنشائها.');
                        setLoading(false);
                        return;
                    }
                    
                    // Validate Manager Data for account creation
                    if (!formData.managerNationalId || formData.managerNationalId.length < 5) {
                        setError('الرجاء إدخال رقم هوية المدير لإنشاء حسابه.');
                        setLoading(false);
                        return;
                    }

                    const newSchool: School = {
                        id: Date.now().toString() + '_sch',
                        name: formData.schoolName,
                        ministryCode: formData.schoolCode,
                        managerName: formData.managerName || 'غير مسجل',
                        managerNationalId: formData.managerNationalId,
                        educationAdministration: formData.educationAdmin || '',
                        type: formData.schoolType as any || 'PUBLIC',
                        phone: '',
                        studentCount: 0
                    };
                    
                    // 1. Create School
                    await tryAddSchool(newSchool);
                    
                    schoolId = newSchool.id;
                    managerId = formData.managerNationalId;

                    // 2. Create System User for Manager (Auto-generated)
                    // Password = Last 4 digits of National ID
                    const mgrPassword = formData.managerNationalId.trim().slice(-4);
                    
                    const managerUser: SystemUser = {
                        id: `mgr_${Date.now()}`,
                        name: formData.managerName || 'مدير المدرسة',
                        email: `manager.${formData.managerNationalId}@system.local`, // Dummy email for unique constraint if needed
                        nationalId: formData.managerNationalId, // Used for login
                        password: mgrPassword,
                        role: 'SCHOOL_MANAGER',
                        schoolId: newSchool.id,
                        status: 'ACTIVE',
                        phone: ''
                    };

                    // Add manager to system users
                    await addSystemUser(managerUser);
                }
            }

            const newTeacher: Teacher = {
                id: Date.now().toString(),
                name: formData.name,
                nationalId: formData.nationalId,
                email: formData.email,
                phone: formData.phone,
                role: 'TEACHER', 
                status: 'ACTIVE', 
                subjectSpecialty: