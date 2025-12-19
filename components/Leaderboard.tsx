import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, SystemUser } from '../types';
// Added List to imports to resolve the error on line 163
import { Trophy, Medal, Star, TrendingUp, Search, Filter, ArrowLeft, Crown, Zap, User, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ students, attendance, performance }) => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    return Array.from(classes).sort();
  }, [students]);

  const rankedStudents = useMemo(() => {
    const list = students.map(student => {
      const myAtt = attendance.filter(a => a.studentId === student.id);
      const myPerf = performance.filter(p => p.studentId === student.id);
      
      let xp = 0;
      // حساب نقاط الحضور والسلوك
      myAtt.forEach(a => {
        if (a.status === AttendanceStatus.PRESENT) xp += 10;
        if (a.status === AttendanceStatus.LATE) xp += 5;
        if (a.behaviorStatus === BehaviorStatus.POSITIVE) xp += 50;
        if (a.behaviorStatus === BehaviorStatus.NEGATIVE) xp -= 30;
      });

      // حساب نقاط الدرجات
      myPerf.forEach(p => {
        const ratio = p.score / p.maxScore;
        if (ratio === 1) xp += 100;
        else if (ratio >= 0.9) xp += 50;
        else if (ratio >= 0.7) xp += 20;
      });

      const avgGrade = myPerf.length > 0 
        ? Math.round((myPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / myPerf.length) * 100) 
        : 0;

      return {
        ...student,
        xp,
        avgGrade,
        absentCount: myAtt.filter(a => a.status === AttendanceStatus.ABSENT).length
      };
    });

    let filtered = list;
    if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
    if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));

    return filtered.sort((a, b) => b.xp - a.xp);
  }, [students, attendance, performance, selectedClass, searchTerm]);

  const topThree = rankedStudents.slice(0, 3);
  const theRest = rankedStudents.slice(3);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <Trophy className="text-yellow-500" size={32}/> لوحة الشرف والمتفوقين
          </h2>
          <p className="text-gray-500 mt-1">تكريم الطلاب الأكثر اجتهاداً وانضباطاً</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
            <input 
              className="w-full pr-10 pl-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              placeholder="بحث عن طالب..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="p-2 border rounded-xl bg-white font-bold text-sm outline-none"
          >
            <option value="">جميع الفصول</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {rankedStudents.length > 0 && (
        <div className="flex justify-center items-end gap-2 md:gap-8 mb-12 mt-10 h-64">
          {/* Second Place */}
          {topThree[1] && (
            <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative group cursor-pointer" onClick={() => navigate('/followup', { state: { studentId: topThree[1].id } })}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-black text-gray-600">
                  {topThree[1].name.charAt(0)}
                </div>
                <div className="absolute -top-3 -right-3 bg-gray-400 text-white p-1.5 rounded-full shadow-md"><Medal size={16}/></div>
              </div>
              <div className="mt-3 text-center">
                <p className="font-bold text-gray-800 text-sm truncate w-24">{topThree[1].name.split(' ')[0]}</p>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{topThree[1].xp} XP</span>
              </div>
              <div className="w-24 h-24 bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-xl mt-2 flex items-start justify-center pt-2 font-black text-gray-500 text-2xl shadow-inner">2</div>
            </div>
          )}

          {/* First Place */}
          {topThree[0] && (
            <div className="flex flex-col items-center animate-slide-up">
              <div className="relative group cursor-pointer" onClick={() => navigate('/followup', { state: { studentId: topThree[0].id } })}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce"><Crown size={40} fill="currentColor"/></div>
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-yellow-400 border-4 border-white shadow-2xl flex items-center justify-center text-4xl font-black text-white">
                  {topThree[0].name.charAt(0)}
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-2 rounded-full shadow-lg border-2 border-white"><Trophy size={20}/></div>
              </div>
              <div className="mt-3 text-center">
                <p className="font-black text-gray-900 text-lg">{topThree[0].name.split(' ')[0]}</p>
                <span className="text-xs font-black text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">{topThree[0].xp} XP</span>
              </div>
              <div className="w-32 h-40 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-2xl mt-2 flex items-start justify-center pt-4 font-black text-white text-5xl shadow-lg relative">
                1
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"></div>
              </div>
            </div>
          )}

          {/* Third Place */}
          {topThree[2] && (
            <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative group cursor-pointer" onClick={() => navigate('/followup', { state: { studentId: topThree[2].id } })}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-orange-100 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-black text-orange-700">
                  {topThree[2].name.charAt(0)}
                </div>
                <div className="absolute -top-3 -right-3 bg-orange-500 text-white p-1.5 rounded-full shadow-md"><Medal size={16}/></div>
              </div>
              <div className="mt-3 text-center">
                <p className="font-bold text-gray-800 text-sm truncate w-24">{topThree[2].name.split(' ')[0]}</p>
                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{topThree[2].xp} XP</span>
              </div>
              <div className="w-24 h-16 bg-gradient-to-t from-orange-300 to-orange-100 rounded-t-xl mt-2 flex items-start justify-center pt-1 font-black text-orange-600 text-xl shadow-inner">3</div>
            </div>
          )}
        </div>
      )}

      {/* List for the rest */}
      <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center px-8">
            <h4 className="font-bold text-gray-700 flex items-center gap-2"><List size={18}/> الترتيب العام</h4>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">مجموع النقاط (XP)</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <tbody className="divide-y divide-gray-50">
              {rankedStudents.map((s, idx) => (
                <tr 
                  key={s.id} 
                  onClick={() => navigate('/followup', { state: { studentId: s.id } })}
                  className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                >
                  <td className="p-4 w-16 text-center font-black text-gray-300 group-hover:text-indigo-600">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${idx < 3 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 group-hover:text-indigo-700">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{s.className} • متوسط الدرجات: {s.avgGrade}%</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center gap-1">
                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${s.absentCount > 3 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            غياب: {s.absentCount}
                        </span>
                    </div>
                  </td>
                  <td className="p-4 text-left">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl font-black shadow-inner">
                      <Zap size={14} fill="currentColor"/> {s.xp}
                    </div>
                  </td>
                </tr>
              ))}
              {rankedStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-gray-400 font-bold">لا يوجد طلاب مطابقين للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;