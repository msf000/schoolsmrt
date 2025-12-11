
import React, { useState, useEffect, useMemo } from 'react';
import { LessonLink, SystemUser, Subject } from '../types';
import { getLessonLinks, saveLessonLink, deleteLessonLink, getSubjects } from '../services/storageService';
import { Plus, Trash2, ExternalLink, Search, Link as LinkIcon, BookOpen, Video, FileText, Globe } from 'lucide-react';

interface ResourcesViewProps {
    currentUser: SystemUser;
}

const ResourcesView: React.FC<ResourcesViewProps> = ({ currentUser }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Filters
    const [targetGrade, setTargetGrade] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Add State
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [newGrade, setNewGrade] = useState('');
    const [newClass, setNewClass] = useState('');

    useEffect(() => {
        if(currentUser?.id) {
            setLinks(getLessonLinks().filter(l => l.teacherId === currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    const handleAdd = () => {
        if (!newTitle || !newUrl) return;
        const link: LessonLink = {
            id: Date.now().toString(),
            title: newTitle,
            url: newUrl,
            teacherId: currentUser.id,
            gradeLevel: newGrade,
            className: newClass,
            createdAt: new Date().toISOString()
        };
        saveLessonLink(link);
        setLinks(getLessonLinks().filter(l => l.teacherId === currentUser.id));
        setNewTitle(''); setNewUrl('');
    };

    const handleDelete = (id: string) => {
        if(confirm('حذف الرابط؟')) {
            deleteLessonLink(id);
            setLinks(getLessonLinks().filter(l => l.teacherId === currentUser.id));
        }
    };

    const filteredLinks = useMemo(() => {
        return links.filter(l => 
            (!targetGrade || l.gradeLevel === targetGrade) &&
            (!searchTerm || l.title.includes(searchTerm))
        );
    }, [links, targetGrade, searchTerm]);

    const getIcon = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return <Video className="text-red-600" size={24}/>;
        if (url.endsWith('.pdf')) return <FileText className="text-red-500" size={24}/>;
        return <Globe className="text-blue-500" size={24}/>;
    };

    return (
        <div className="p-6 h-full bg-gray-50 animate-fade-in flex flex-col">
            <div className="flex flex-col md:flex-row gap-6 h-full">
                {/* Add Form */}
                <div className="w-full md:w-1/3 bg-white p-6 rounded-xl border border-gray-200 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="text-teal-600"/> إضافة مصدر جديد</h3>
                    <div className="space-y-4">
                        <input className="w-full p-2 border rounded" placeholder="عنوان المصدر" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                        <input className="w-full p-2 border rounded dir-ltr text-left" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} />
                        
                        <select className="w-full p-2 border rounded text-xs" value={newGrade} onChange={e => setNewGrade(e.target.value)}>
                            <option value="">الصف المستهدف (اختياري)</option>
                            {[
                                "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                                "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                                "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                                "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                            ].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>

                        <button onClick={handleAdd} className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700">إضافة</button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                            <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        </div>
                        <div>
                            <select className="w-full p-2 border rounded text-xs" value={targetGrade} onChange={e => setTargetGrade(e.target.value)}>
                                <option value="">كل الصفوف</option>
                                {[
                                    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                                    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                                    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                                    "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                                ].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {filteredLinks.map(link => (
                            <div key={link.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 group">
                                <div className="p-2 bg-gray-100 rounded">{getIcon(link.url)}</div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-bold text-gray-800 truncate"><a href={link.url} target="_blank" rel="noreferrer" className="hover:underline">{link.title}</a></h4>
                                    <p className="text-xs text-gray-500 truncate dir-ltr text-right">{link.url}</p>
                                    <div className="flex gap-2 mt-1">
                                        {link.gradeLevel && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 rounded border">{link.gradeLevel}</span>}
                                        {link.className && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 rounded border">{link.className}</span>}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(link.id)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {filteredLinks.length === 0 && <div className="text-center py-20 text-gray-400">لا توجد مصادر</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourcesView;
