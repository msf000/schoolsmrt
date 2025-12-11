
import React, { useState, useEffect } from 'react';
import { LessonLink, SystemUser } from '../types';
import { getLessonLinks, saveLessonLink, deleteLessonLink } from '../services/storageService';
import { BookOpen, Plus, Trash2, ExternalLink, Filter, Link as LinkIcon, Youtube, FileText, Globe } from 'lucide-react';

interface ResourcesViewProps {
    currentUser: any;
}

const ResourcesView: React.FC<ResourcesViewProps> = ({ currentUser }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [targetGrade, setTargetGrade] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        setLinks(getLessonLinks());
    }, []);

    const filteredLinks = links.filter(l => {
        // Teacher sees their own + public ones (if we had public flag, for now simplified)
        // Here we just filter by what's available
        if (targetGrade && l.gradeLevel !== targetGrade) return false;
        if (search && !l.title.includes(search)) return false;
        return true;
    });

    const handleSave = () => {
        if (!newTitle || !newUrl) return;
        saveLessonLink({ 
            id: Date.now().toString(), 
            title: newTitle, 
            url: newUrl, 
            gradeLevel: targetGrade,
            teacherId: currentUser?.id, 
            createdAt: new Date().toISOString() 
        });
        setLinks(getLessonLinks());
        setNewTitle(''); setNewUrl(''); setShowForm(false);
    };

    const handleDelete = (id: string) => {
        if(confirm('حذف هذا الرابط؟')) {
            deleteLessonLink(id);
            setLinks(getLessonLinks());
        }
    };

    const getIcon = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return <Youtube className="text-red-600" size={24}/>;
        if (url.endsWith('.pdf')) return <FileText className="text-red-500" size={24}/>;
        return <Globe className="text-blue-500" size={24}/>;
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BookOpen className="text-blue-600"/> مكتبة المصادر</h2>
                    <p className="text-sm text-gray-500">روابط إثرائية، فيديوهات، وملفات للطلاب.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md">
                    <Plus size={18}/> رابط جديد
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border mb-4 flex gap-4 items-center">
                <Filter size={16} className="text-gray-400"/>
                <select className="p-2 border rounded text-sm font-bold text-gray-700" value={targetGrade} onChange={e => setTargetGrade(e.target.value)}>
                    <option value="">جميع الصفوف</option>
                    {[
                        "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                        "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                        "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                        "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                    ].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input className="flex-1 p-2 border rounded text-sm" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                {filteredLinks.map(link => (
                    <div key={link.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group flex flex-col">
                        <div className="flex items-start gap-4 mb-3">
                            <div className="p-3 bg-gray-50 rounded-lg">{getIcon(link.url)}</div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-gray-800 truncate" title={link.title}>{link.title}</h4>
                                <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-1">{link.url}</a>
                            </div>
                        </div>
                        <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-50">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{link.gradeLevel || 'عام'}</span>
                            <button onClick={() => handleDelete(link.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
                {filteredLinks.length === 0 && <div className="col-span-full text-center py-20 text-gray-400">لا توجد روابط</div>}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">إضافة مصدر جديد</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-gray-600 mb-1">العنوان</label><input className="w-full p-2 border rounded" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus/></div>
                            <div><label className="block text-sm font-bold text-gray-600 mb-1">الرابط (URL)</label><input className="w-full p-2 border rounded dir-ltr" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..."/></div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">الصف المستهدف</label>
                                <select className="w-full p-2 border rounded text-sm" value={targetGrade} onChange={e => setTargetGrade(e.target.value)}>
                                    <option value="">عام (للجميع)</option>
                                    {[
                                        "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                                        "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                                        "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                                        "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                                    ].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">إلغاء</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded">حفظ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesView;
