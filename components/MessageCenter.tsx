
import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, MessageLog, AttendanceStatus } from '../types';
import { getMessages, saveMessage } from '../services/storageService';
import { MessageSquare, Send, Clock, User, Filter, AlertTriangle, CheckCircle, Sparkles, Smartphone, Mail, History, Copy, X } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface MessageCenterProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
}

const TEMPLATES = [
    { id: 'absent_warning', title: 'تنبيه غياب', text: 'السلام عليكم، نود إشعاركم بأن الطالب {اسم_الطالب} تغيب اليوم. نرجو تزويدنا بالمبرر.' },
    { id: 'praise_grade', title: 'تهنئة تفوق', text: 'نبارك للطالب {اسم_الطالب} حصوله على درجة ممتازة في {المادة}. شكراً لاهتمامكم.' },
    { id: 'late_notice', title: 'تأخر صباحي', text: 'عزيزي ولي الأمر، وصل الطالب {اسم_الطالب} متأخراً اليوم. نرجو الحرص على الحضور المبكر.' },
    { id: 'behavior_positive', title: 'شكر سلوكي', text: 'نشكر للطالب {اسم_الطالب} سلوكه المتميز في الفصل اليوم.' },
    { id: 'general_meeting', title: 'دعوة اجتماع', text: 'ندعوكم لحضور مجلس الآباء يوم {اليوم} لمناقشة مستوى الطالب {اسم_الطالب}.' },
];

const MessageCenter: React.FC<MessageCenterProps> = ({ students, attendance, performance }) => {
    const [activeTab, setActiveTab] = useState<'SMART' | 'COMPOSE' | 'HISTORY'>('SMART');
    const [history, setHistory] = useState<MessageLog[]>([]);
    
    // Compose State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [messageText, setMessageText] = useState('');
    const [previewMessage, setPreviewMessage] = useState('');

    // Smart Triggers State
    const [triggerType, setTriggerType] = useState<'ABSENT_TODAY' | 'LOW_ATTENDANCE' | 'HIGH_PERFORMANCE'>('ABSENT_TODAY');

    useEffect(() => {
        setHistory(getMessages());
    }, []);

    // Unique Classes
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    // Filter Students for Compose
    const filteredStudents = useMemo(() => {
        if (!selectedClass) return students;
        return students.filter(s => s.className === selectedClass);
    }, [students, selectedClass]);

    // Smart Filter Logic
    const smartList = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        
        if (triggerType === 'ABSENT_TODAY') {
            return students.filter(s => {
                const record = attendance.find(a => a.studentId === s.id && a.date === today);
                return record?.status === AttendanceStatus.ABSENT;
            }).map(s => ({ ...s, reason: 'غائب اليوم' }));
        }
        
        if (triggerType === 'LOW_ATTENDANCE') {
            return students.filter(s => {
                const myAtt = attendance.filter(a => a.studentId === s.id);
                const total = myAtt.length;
                if (total < 5) return false;
                const absent = myAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
                return (absent / total) > 0.15; // More than 15% absent
            }).map(s => ({ ...s, reason: 'نسبة الغياب تجاوزت 15%' }));
        }

        if (triggerType === 'HIGH_PERFORMANCE') {
             // Mock logic: Avg score > 90%
             return students.filter(s => {
                 const myPerf = performance.filter(p => p.studentId === s.id);
                 if (myPerf.length < 3) return false;
                 const totalScore = myPerf.reduce((a,b) => a + (b.score/b.maxScore), 0);
                 const avg = totalScore / myPerf.length;
                 return avg >= 0.9;
             }).map(s => ({ ...s, reason: 'أداء أكاديمي ممتاز' }));
        }

        return [];
    }, [triggerType, students, attendance, performance]);

    const handleSelectTemplate = (text: string) => {
        setMessageText(text);
        updatePreview(text, students[0]); // Preview with first student just as example
    };

    const updatePreview = (text: string, student?: Student) => {
        if (!student) {
            setPreviewMessage(text);
            return;
        }
        let processed = text.replace(/{اسم_الطالب}/g, student.name);
        processed = processed.replace(/{المادة}/g, 'المادة'); // Generic placeholder
        processed = processed.replace(/{اليوم}/g, new Date().toLocaleDateString('ar-SA', {weekday: 'long'}));
        setPreviewMessage(processed);
    };

    const handleSendMessage = (student: Student, text: string, method: 'WHATSAPP' | 'COPY') => {
        if (!student.parentPhone && method === 'WHATSAPP') {
            alert(`لا يوجد رقم هاتف لولي أمر الطالب ${student.name}`);
            return;
        }

        let finalMsg = text.replace(/{اسم_الطالب}/g, student.name);
        finalMsg = finalMsg.replace(/{المادة}/g, 'المادة العامة'); // Could be dynamic
        finalMsg = finalMsg.replace(/{اليوم}/g, new Date().toLocaleDateString('ar-SA', {weekday: 'long'}));

        // Log Message
        const log: MessageLog = {
            id: Date.now().toString(),
            studentId: student.id,
            studentName: student.name,
            parentPhone: student.parentPhone,
            type: method === 'WHATSAPP' ? 'WHATSAPP' : 'SMS',
            content: finalMsg,
            status: 'SENT',
            date: new Date().toISOString(),
            sentBy: 'Teacher' // Or current user name
        };
        saveMessage(log);
        setHistory(prev => [log, ...prev]);

        // Action
        if (method === 'WHATSAPP') {
            const phone = student.parentPhone!.replace(/\D/g, ''); // Clean phone
            // Add country code if missing (Simple assumption for SA)
            const formattedPhone = phone.startsWith('966') ? phone : `966${phone.startsWith('0') ? phone.slice(1) : phone}`;
            const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(finalMsg)}`;
            window.open(url, '_blank');
        } else {
            // Copy to clipboard
            navigator.clipboard.writeText(finalMsg);
            alert('تم نسخ نص الرسالة: ' + finalMsg);
        }
    };

    const toggleStudentSelection = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudents(newSet);
    }

    const selectAll = () => {
        if (selectedStudents.size === filteredStudents.length) setSelectedStudents(new Set());
        else setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MessageSquare className="text-teal-600"/> مركز الرسائل الذكي
                    </h2>
                    <p className="text-sm text-gray-500">إرسال تنبيهات، تهنئة، ومتابعة التواصل مع أولياء الأمور.</p>
                </div>
                
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button onClick={() => setActiveTab('SMART')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'SMART' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
                        <Sparkles size={16}/> المحلل الذكي
                    </button>
                    <button onClick={() => setActiveTab('COMPOSE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'COMPOSE' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
                        <Send size={16}/> إرسال رسالة
                    </button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
                        <History size={16}/> السجل
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                
                {/* --- SMART TAB --- */}
                {activeTab === 'SMART' && (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b bg-teal-50/30">
                            <h3 className="font-bold text-gray-800 mb-4">اقتراحات النظام (بناءً على البيانات)</h3>
                            <div className="flex gap-4">
                                <button onClick={() => setTriggerType('ABSENT_TODAY')} className={`p-4 rounded-xl border flex-1 text-center transition-all ${triggerType === 'ABSENT_TODAY' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="text-red-500 mb-2 mx-auto w-fit"><AlertTriangle/></div>
                                    <div className="font-bold text-gray-800">غائبون اليوم</div>
                                    <div className="text-xs text-gray-500 mt-1">إرسال استفسار للغياب</div>
                                </button>
                                <button onClick={() => setTriggerType('LOW_ATTENDANCE')} className={`p-4 rounded-xl border flex-1 text-center transition-all ${triggerType === 'LOW_ATTENDANCE' ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="text-orange-500 mb-2 mx-auto w-fit"><Clock/></div>
                                    <div className="font-bold text-gray-800">إنذار الحضور</div>
                                    <div className="text-xs text-gray-500 mt-1">تجاوزوا نسبة الغياب المسموحة</div>
                                </button>
                                <button onClick={() => setTriggerType('HIGH_PERFORMANCE')} className={`p-4 rounded-xl border flex-1 text-center transition-all ${triggerType === 'HIGH_PERFORMANCE' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="text-green-500 mb-2 mx-auto w-fit"><CheckCircle/></div>
                                    <div className="font-bold text-gray-800">المتفوقون</div>
                                    <div className="text-xs text-gray-500 mt-1">إرسال تهنئة وشكر</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {smartList.length > 0 ? (
                                <div className="space-y-3">
                                    {smartList.map(s => (
                                        <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${triggerType === 'HIGH_PERFORMANCE' ? 'bg-green-500' : 'bg-red-500'}`}>
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{s.name}</h4>
                                                    <p className="text-xs text-gray-500">{s.gradeLevel} - {s.className} • {s.reason}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleSendMessage(s, 
                                                        triggerType === 'HIGH_PERFORMANCE' ? TEMPLATES.find(t=>t.id==='praise_grade')!.text : TEMPLATES.find(t=>t.id==='absent_warning')!.text,
                                                        'WHATSAPP'
                                                    )} 
                                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700"
                                                >
                                                    <Smartphone size={14}/> واتساب
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    <CheckCircle size={48} className="mx-auto mb-4 opacity-20"/>
                                    <p>لا يوجد طلاب يطابقون هذا المعيار حالياً.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- COMPOSE TAB --- */}
                {activeTab === 'COMPOSE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-x divide-x-reverse divide-gray-200">
                        {/* Right: Selection & Compose */}
                        <div className="p-6 flex flex-col overflow-auto">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">1. اختر الفصل</label>
                                <select 
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                >
                                    <option value="">-- كل الفصول --</option>
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="mb-4 flex-1 min-h-0 flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-gray-700">2. اختر الطلاب ({selectedStudents.size})</label>
                                    <button onClick={selectAll} className="text-xs text-teal-600 hover:underline">تحديد الكل</button>
                                </div>
                                <div className="flex-1 border rounded-lg overflow-y-auto p-2 space-y-1 bg-gray-50">
                                    {filteredStudents.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => toggleStudentSelection(s.id)}
                                            className={`p-2 rounded cursor-pointer flex justify-between items-center text-sm ${selectedStudents.has(s.id) ? 'bg-teal-100 text-teal-900 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                                        >
                                            <span>{s.name}</span>
                                            {selectedStudents.has(s.id) && <CheckCircle size={14} className="text-teal-600"/>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Left: Message & Templates */}
                        <div className="p-6 flex flex-col bg-gray-50/50">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">3. نص الرسالة</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                                    {TEMPLATES.map(t => (
                                        <button 
                                            key={t.id} 
                                            onClick={() => handleSelectTemplate(t.text)}
                                            className="px-3 py-1 bg-white border rounded-full text-xs whitespace-nowrap hover:border-teal-500 hover:text-teal-600 transition-colors"
                                        >
                                            {t.title}
                                        </button>
                                    ))}
                                </div>
                                <textarea 
                                    className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                    placeholder="اكتب نص الرسالة هنا... استخدم {اسم_الطالب} كمتغير"
                                    value={messageText}
                                    onChange={e => { setMessageText(e.target.value); updatePreview(e.target.value, students[0]); }}
                                />
                                <div className="mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
                                    <b>متغيرات ذكية:</b> {`{اسم_الطالب}`} سيتم استبداله تلقائياً.
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button 
                                    disabled={selectedStudents.size === 0 || !messageText}
                                    onClick={() => {
                                        const targets = students.filter(s => selectedStudents.has(s.id));
                                        targets.forEach(s => handleSendMessage(s, messageText, 'WHATSAPP'));
                                    }}
                                    className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex justify-center items-center gap-2 disabled:opacity-50 shadow-md"
                                >
                                    <Smartphone size={18}/> إرسال عبر واتساب ({selectedStudents.size})
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- HISTORY TAB --- */}
                {activeTab === 'HISTORY' && (
                    <div className="flex-1 overflow-auto p-6">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold">
                                <tr>
                                    <th className="p-3">التاريخ</th>
                                    <th className="p-3">الطالب</th>
                                    <th className="p-3">نوع الرسالة</th>
                                    <th className="p-3 w-1/2">النص</th>
                                    <th className="p-3">المرسل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {history.map(msg => (
                                    <tr key={msg.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-xs font-mono text-gray-500">{formatDualDate(msg.date)}</td>
                                        <td className="p-3 font-bold text-gray-800">{msg.studentName}</td>
                                        <td className="p-3">
                                            {msg.type === 'WHATSAPP' ? 
                                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-bold"><Smartphone size={12}/> WhatsApp</span> : 
                                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold"><Mail size={12}/> SMS/Copy</span>
                                            }
                                        </td>
                                        <td className="p-3 text-gray-600 truncate max-w-xs" title={msg.content}>{msg.content}</td>
                                        <td className="p-3 text-xs text-gray-500">{msg.sentBy}</td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">لا يوجد سجل رسائل سابق</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageCenter;
