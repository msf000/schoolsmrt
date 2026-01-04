
import React, { useState, useEffect, useMemo } from 'react';
import { WallPost, SystemUser, Student } from '../types';
import { fetchWallPosts, saveWallPost } from '../services/storageService';
import { 
    Sparkles, Image as ImageIcon, Send, Heart, MessageCircle, 
    MoreHorizontal, Share2, Plus, Camera, X, Trophy, Star, Zap,
    Award, Crown, Flag, Newspaper, Calendar, Loader2
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface Props {
    currentUser: SystemUser | Student;
    students: Student[];
}

const SchoolWall: React.FC<Props> = ({ currentUser, students }) => {
    const [posts, setPosts] = useState<WallPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'ACHIEVEMENTS' | 'NEWS'>('ALL');

    const schoolId = (currentUser as any).schoolId || 'GLOBAL';

    useEffect(() => {
        loadPosts();
    }, [schoolId]);

    const loadPosts = async () => {
        try {
            const res = await fetchWallPosts(schoolId);
            setPosts(res || []);
        } catch (e) {
            console.error("Error loading posts:", e);
            setPosts([]);
        }
    };

    const handlePost = async () => {
        if (!newPostContent.trim()) return;
        setIsPosting(true);
        const post: WallPost = {
            id: `post_${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            content: newPostContent,
            type: 'NEWS',
            createdAt: new Date().toISOString(),
            likes: 0,
            schoolId: schoolId
        };
        await saveWallPost(post);
        setNewPostContent('');
        setIsPosting(false);
        loadPosts();
    };

    const studentOfTheMonth = useMemo(() => {
        if (!students || students.length === 0) return null;
        return [...students].sort((a,b) => (b.xp || 0) - (a.xp || 0))[0];
    }, [students]);

    const filteredPosts = posts.filter(p => filter === 'ALL' || p.type === filter);

    return (
        <div className="p-4 md:p-8 h-full flex flex-col lg:flex-row gap-8 bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden" dir="rtl">
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-32 lg:pb-10">
                {/* Create Post */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shrink-0 group transition-all">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="flex-1 space-y-4">
                            <textarea 
                                className="w-full bg-slate-50 border-none rounded-3xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 min-h-[100px] resize-none"
                                placeholder={`بمَ تشعر اليوم يا ${currentUser.name.split(' ')[0]}؟ شاركنا خبراً أو إنجازاً...`}
                                value={newPostContent}
                                onChange={e => setNewPostContent(e.target.value)}
                            />
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><ImageIcon size={20}/></button>
                                    <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><Camera size={20}/></button>
                                </div>
                                <button 
                                    onClick={handlePost}
                                    disabled={isPosting || !newPostContent.trim()}
                                    className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPosting ? <Loader2 className="animate-spin" size={16}/> : <Send size={18}/>} نشر الآن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm self-start overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={()=>setFilter('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filter==='ALL'?'bg-indigo-600 text-white shadow-lg':'text-gray-400'}`}>الكل</button>
                    <button onClick={()=>setFilter('ACHIEVEMENTS')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filter==='ACHIEVEMENTS'?'bg-indigo-600 text-white shadow-lg':'text-gray-400'}`}>تكريم</button>
                    <button onClick={()=>setFilter('NEWS')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filter==='NEWS'?'bg-indigo-600 text-white shadow-lg':'text-gray-400'}`}>أخبار</button>
                </div>

                {/* Feed */}
                <div className="space-y-6">
                    {filteredPosts.map(post => (
                        <div key={post.id} className="bg-white p-8 rounded-[3rem] border border-slate-50 shadow-sm hover:shadow-xl transition-all animate-slide-up group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                                        {post.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800">{post.userName}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDualDate(post.createdAt)}</p>
                                    </div>
                                </div>
                                <button className="p-2 text-slate-300 hover:bg-slate-50 rounded-xl transition-all"><MoreHorizontal size={20}/></button>
                            </div>
                            <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed font-medium mb-8">
                                {post.content}
                            </div>
                            <div className="pt-6 border-t flex justify-between items-center">
                                <div className="flex gap-6">
                                    <button className="flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-all font-black text-xs">
                                        <Heart size={20} className={post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}/> {post.likes}
                                    </button>
                                    <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all font-black text-xs">
                                        <MessageCircle size={20}/> 0
                                    </button>
                                </div>
                                <button className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><Share2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {filteredPosts.length === 0 && (
                        <div className="py-20 text-center text-slate-300 opacity-50 flex flex-col items-center">
                            <Newspaper size={48} className="mb-4"/>
                            <p className="font-bold">لا توجد منشورات حالياً.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Widgets */}
            <div className="w-full lg:w-96 space-y-6">
                {studentOfTheMonth && (
                    <div className="bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><Crown size={180}/></div>
                        <div className="relative z-10 text-center">
                            <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-[2rem] flex items-center justify-center text-slate-900 mx-auto mb-6 shadow-2xl border-4 border-white/20">
                                <Star fill="currentColor" size={48}/>
                            </div>
                            <h3 className="text-xl font-black mb-1">نجم الأسبوع</h3>
                            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Hall of Fame</p>
                            <h4 className="text-2xl font-black mb-6">{studentOfTheMonth.name}</h4>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex justify-between items-center">
                                <div><p className="text-[9px] font-black text-indigo-400 uppercase">الرصيد</p><p className="text-xl font-black">{studentOfTheMonth.xp} XP</p></div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div><p className="text-[9px] font-black text-indigo-400 uppercase">الفصل</p><p className="text-xl font-black">{studentOfTheMonth.className}</p></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Calendar className="text-indigo-600"/> أجندة الفعاليات</h3>
                    <div className="space-y-4">
                        <EventCard date="25" month="أكتوبر" title="معرض الابتكار المدرسي" />
                        <EventCard date="02" month="نوفمبر" title="الاختبارات الدورية 1" />
                        <EventCard date="15" month="نوفمبر" title="رحلة علمية (المتحف)" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const EventCard = ({ date, month, title }: any) => (
    <div className="flex items-center gap-5 group cursor-pointer">
        <div className="bg-slate-50 p-3 rounded-2xl text-center min-w-[60px] group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <p className="text-xl font-black leading-none">{date}</p>
            <p className="text-[8px] font-black uppercase mt-1 opacity-60">{month}</p>
        </div>
        <p className="text-xs font-black text-slate-600 leading-tight group-hover:text-indigo-600 transition-colors">{title}</p>
    </div>
);

export default SchoolWall;
