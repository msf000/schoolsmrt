
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Trophy, Download, Loader2, Save, Wand2, Star, Zap, Image as ImageIcon } from 'lucide-react';
import { Student, Badge } from '../types';
import { updateStudent } from '../services/storageService';

interface SmartBadgesProps {
  students: Student[];
}

const SmartBadges: React.FC<SmartBadgesProps> = ({ students }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [badgeName, setBadgeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedImageUrl(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullPrompt = `A professional, high-quality, 3D render of a school achievement badge icon. Theme: ${prompt}. Clean white background, vibrant colors, premium look, round shape, educational style.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            setGeneratedImageUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert('فشل توليد الوسام. يرجى المحاولة لاحقاً.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToStudent = async () => {
    if (!selectedStudentId || !generatedImageUrl || !badgeName) return;
    setIsSaving(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        const newBadge: Badge = {
          id: `badge_${Date.now()}`,
          name: badgeName,
          icon: generatedImageUrl,
          color: 'text-indigo-600',
          description: prompt,
          unlockedAt: new Date().toISOString()
        };
        const updatedBadges = [...(student.badges || []), newBadge];
        await updateStudent({ ...student, badges: updatedBadges });
        alert(`تم منح وسام "${badgeName}" للطالب ${student.name} بنجاح!`);
        setGeneratedImageUrl(null);
        setBadgeName('');
        setPrompt('');
      }
    } catch (e) {
      alert('فشل الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <Sparkles className="text-indigo-600" size={36}/> 
          مصمم الأوسمة الذكي (AI Badges)
        </h2>
        <p className="text-gray-500 font-bold mt-1">ابتكر أوسمة فريدة لطلابك باستخدام قوة التوليد الصوري</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
        {/* Creation Controls */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">موضوع الوسام</label>
            <div className="relative">
              <input 
                className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-3xl outline-none font-bold text-lg transition-all text-center"
                placeholder="مثلاً: بطل القراءة، عبقري الرياضيات..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <Wand2 className="absolute left-6 top-6 text-indigo-400" size={24}/>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={28}/> : <Sparkles size={28}/>}
            {isGenerating ? 'جاري رسم الوسام...' : 'توليد الوسام الآن'}
          </button>

          {generatedImageUrl && (
            <div className="space-y-6 animate-slide-up pt-6 border-t border-gray-100">
               <h4 className="font-black text-gray-800 flex items-center gap-2"><Trophy className="text-yellow-500"/> رصد الوسام لطالب</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">اسم الوسام</label>
                    <input className="w-full p-3 bg-gray-50 border rounded-2xl font-bold" value={badgeName} onChange={e=>setBadgeName(e.target.value)} placeholder="مثلاً: وسام الفارس"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">الطالب المكرم</label>
                    <select className="w-full p-3 bg-gray-50 border rounded-2xl font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                      <option value="">-- اختر الطالب --</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
               </div>
               <button 
                onClick={handleSaveToStudent}
                disabled={isSaving || !selectedStudentId || !badgeName}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
               >
                {isSaving ? <Loader2 className="animate-spin"/> : <Save/>} حفظ الوسام في ملف الطالب
               </button>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="bg-slate-900 rounded-[3rem] flex flex-col items-center justify-center p-10 relative overflow-hidden shadow-2xl">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-6 animate-pulse z-10">
              <div className="w-64 h-64 bg-white/5 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={80}/>
              </div>
              <p className="text-indigo-300 font-black text-xl">جاري التخيل والابتكار...</p>
            </div>
          ) : generatedImageUrl ? (
            <div className="flex flex-col items-center gap-8 animate-zoom-in z-10">
              <div className="relative group">
                <div className="absolute -inset-4 bg-indigo-500 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity"></div>
                <img src={generatedImageUrl} alt="Badge" className="w-80 h-80 rounded-full border-[12px] border-white/10 shadow-2xl relative z-10 hover:scale-105 transition-transform duration-500"/>
                <div className="absolute top-0 right-0 bg-yellow-400 text-black p-4 rounded-full shadow-2xl z-20 animate-bounce border-4 border-slate-900">
                  <Star fill="currentColor" size={32}/>
                </div>
              </div>
              <button onClick={()=>{const link = document.createElement('a'); link.href=generatedImageUrl; link.download='badge.png'; link.click();}} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all border border-white/10">
                <Download size={20}/> تحميل الصورة
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-8 z-10 opacity-30">
              <div className="w-64 h-64 bg-white/5 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center">
                <ImageIcon size={100} className="text-white"/>
              </div>
              <div>
                <h3 className="text-4xl font-black text-white mb-4">بانتظار الإبداع</h3>
                <p className="text-indigo-200 text-lg max-w-xs font-bold">اكتب موضوع الوسام وسأقوم برسمه لك فوراً</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartBadges;
