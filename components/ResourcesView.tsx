
import React, { useState, useEffect } from 'react';
import { LessonLink, SystemUser } from '../types';
import { getLessonLinks, saveLessonLink, deleteLessonLink } from '../services/storageService';
import { BookOpen, Link as LinkIcon, Youtube, FileText, Globe, Plus, Trash2, Search, ExternalLink, School, Laptop } from 'lucide-react';

interface ResourcesViewProps {
    currentUser?: SystemUser | null;
}

const ResourcesView: React.FC<ResourcesViewProps> = ({ currentUser }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        setLinks(getLessonLinks());
    }, []);

    const filteredLinks = links.filter(l => 
        (l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.url.includes(searchTerm)) &&
        (!l.teacherId || l.teacherId === currentUser?.id)
    );

    const handleAdd = () => {
        if (!newTitle || !newUrl) return;
        saveLessonLink({
            id: Date.now().toString(),
            title: newTitle,
            url: newUrl,
            teacherId: currentUser?.id,
            createdAt: new Date().toISOString()
        });
        setLinks(getLessonLinks());
        setNewTitle('');
        setNewUrl('');
        setIsFormOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('حذف هذا المصدر؟')) {
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
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="text-indigo-600"/> مكتبة المصادر
                    </h2>
                    <p className="text-sm text-gray-500">روابط إثرائية، ملفات، ومراجع للدروس.</p>
                </div>
                <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
                    <Plus size={18}/> مصدر جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <a href="https://schools.madrasati.sa" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Laptop size={24}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">منصة مدرستي</h3>
                        <p className="text-xs text-gray-500">الدخول الموحد للكادر والطلاب</p>
                    </div>
                    <ExternalLink size={16} className="mr-auto text-gray-300 group-hover:text-blue-500"/>
                </a>

                <a href="https://www.ien.edu.sa" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-green-100 hover:border-green-400 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BookOpen size={24}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">بوابة عين التعليمية</h3>
                        <p className="text-xs text-gray-500">الكتب، الفيديوهات، والإثراءات</p>
                    </div>
                    <ExternalLink size={16} className="mr-auto text-gray-300 group-hover:text-green-500"/>
                </a>

                <a href="https://ktbby.com" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-orange-100 hover:border-orange-400 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <School size={24}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">مكتبة كتبي</h3>
                        <p className="text-xs text-gray-500">تحميل المناهج والحلول PDF</p>
                    </div>
                    <ExternalLink size={16} className="mr-auto text-gray-300 group-hover:text-orange-500"/>
                </a>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm mb-4">
                <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input 
                        className="w-full pr-10 pl-4 py-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors outline-none" 
                        placeholder="بحث في المصادر المحفوظة..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-10 custom-scrollbar">
                {filteredLinks.map(link => (
                    <div key={link.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="flex items-start gap-3">
                            <div className="p-3 bg-gray-50 rounded-lg">{getIcon(link.url)}</div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-gray-800 truncate mb-1">{link.title}</h4>
                                <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate block flex items-center gap-1">
                                    <LinkIcon size={10}/> {link.url}
                                </a>
                                <p className="text-[10px] text-gray-400 mt-2 font-mono">{new Date(link.createdAt).toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                        <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded backdrop-blur-sm">
                            <a href={link.url} target="_blank" rel="noreferrer" className="p-1.5 text-gray-600 hover:text-blue-600 bg-white border rounded shadow-sm"><ExternalLink size={14}/></a>
                            <button onClick={() => handleDelete(link.id)} className="p-1.5 text-gray-600 hover:text-red-600 bg-white border rounded shadow-sm"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
                {filteredLinks.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد مصادر محفوظة.</p>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-bounce-in">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">إضافة مصدر جديد</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">العنوان</label>
                                <input className="w-full p-2 border rounded-lg" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus placeholder="مثال: فيديو شرح الدرس الأول"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الرابط (URL)</label>
                                <input className="w-full p-2 border rounded-lg dir-ltr" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..."/>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsFormOpen(false)} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold">إلغاء</button>
                                <button onClick={handleAdd} className="flex-2 w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">حفظ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesView;
