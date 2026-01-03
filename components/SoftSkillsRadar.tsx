
import React, { useMemo } from 'react';
import { Student, BehaviorIncident } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BrainCircuit, Star, Zap, Target, Users, ShieldCheck, Activity } from 'lucide-react';

interface Props {
    student: Student;
    incidents: BehaviorIncident[];
}

const SoftSkillsRadar: React.FC<Props> = ({ student, incidents }) => {
    
    const radarData = useMemo(() => {
        const skills = {
            'القيادة': 70,
            'التعاون': 65,
            'الانضباط': 80,
            'المبادرة': 60,
            'الإبداع': 75
        };

        // تعديل القيم بناءً على السلوك الموثق
        incidents.forEach(i => {
            if (i.category.includes('مساعدة') || i.category.includes('زميل')) skills['التعاون'] += 2;
            if (i.category.includes('مشاركة') || i.category.includes('تميز')) skills['الإبداع'] += 2;
            if (i.category.includes('تأخر') || i.category.includes('كتاب')) skills['الانضباط'] -= 3;
            if (i.category.includes('عدواني')) skills['التعاون'] -= 10;
        });

        return Object.entries(skills).map(([name, val]) => ({
            subject: name,
            A: Math.min(100, Math.max(20, val)),
            fullMark: 100
        }));
    }, [incidents]);

    return (
        <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5 h-[500px] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none"><Zap size={300}/></div>
            
            <div className="relative z-10 mb-8 flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-black flex items-center gap-3"><BrainCircuit className="text-indigo-400"/> تحليل المهارات الناعمة</h3>
                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-1">Behavioral Intelligence Mapping</p>
                </div>
                <div className="bg-white/5 px-4 py-1 rounded-xl border border-white/10 text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12}/> مستخرج آلياً
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold' }} />
                        <Radar
                            name={student.name}
                            dataKey="A"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fill="#6366f1"
                            fillOpacity={0.3}
                        />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: '#1e1b4b', color: '#fff', fontSize: '12px' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-8 flex justify-center gap-6 relative z-10 shrink-0">
                <SkillTag label="قائد" active={radarData[0].A > 80} color="border-indigo-400 text-indigo-400" />
                <SkillTag label="مبدع" active={radarData[4].A > 80} color="border-purple-400 text-purple-400" />
                <SkillTag label="منضبط" active={radarData[2].A > 85} color="border-emerald-400 text-emerald-400" />
            </div>
        </div>
    );
};

const SkillTag = ({ label, active, color }: any) => (
    <div className={`px-5 py-2 rounded-2xl border-2 font-black text-xs transition-all ${active ? `${color} bg-white/5 shadow-lg` : 'border-white/5 text-white/10 opacity-30'}`}>
        {label}
    </div>
);

export default SoftSkillsRadar;
