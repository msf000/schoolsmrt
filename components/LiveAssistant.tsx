
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Sparkles, Volume2, Loader2, Bot, Command } from 'lucide-react';
import { Student } from '../types';

interface LiveAssistantProps {
  students: Student[];
  onAction: (action: string, data: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ students, onAction, isOpen, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'>('IDLE');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const tools: FunctionDeclaration[] = [
    {
      name: 'mark_attendance',
      parameters: {
        type: Type.OBJECT,
        description: 'تسجيل حضور أو غياب طالب معين',
        properties: {
          studentName: { type: Type.STRING, description: 'اسم الطالب' },
          status: { type: Type.STRING, enum: ['PRESENT', 'ABSENT', 'LATE'], description: 'حالة الحضور' }
        },
        required: ['studentName', 'status']
      }
    },
    {
      name: 'award_points',
      parameters: {
        type: Type.OBJECT,
        description: 'منح نقاط تفاعل أو سلوك لطالب',
        properties: {
          studentName: { type: Type.STRING, description: 'اسم الطالب' },
          points: { type: Type.NUMBER, description: 'عدد النقاط (موجب للتعزيز، سالب للتنبيه)' },
          reason: { type: Type.STRING, description: 'سبب النقاط' }
        },
        required: ['studentName', 'points']
      }
    }
  ];

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
      const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      if (audioContextRef.current) {
        setStatus('SPEAKING');
        const buffer = await decodeAudioData(bytes, audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        const startTime = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
        sourcesRef.current.add(source);
        source.onended = () => {
            sourcesRef.current.delete(source);
            if (sourcesRef.current.size === 0) setStatus('LISTENING');
        };
      }
    }

    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        onAction(fc.name, fc.args);
        sessionRef.current?.sendToolResponse({
          functionResponses: [{ id: fc.id, name: fc.name, response: { result: 'تم التنفيذ بنجاح' } }]
        });
      }
    }

    if (message.serverContent?.interrupted) {
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  }, [onAction]);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `أنت مساعد المعلم الذكي الصوتي. الطلاب الحاليين هم: ${students.map(s => s.name).join(', ')}. 
          يمكنك مساعدة المعلم في رصد الحضور وإعطاء النقاط. تكلم باختصار شديد وبلهجة سعودية ودية.`,
          tools: [{ functionDeclarations: tools }]
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            setStatus('LISTENING');
            
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              
              const bytes = new Uint8Array(int16.buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              
              sessionPromise.then(s => s.sendRealtimeInput({
                media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' }
              }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: handleMessage,
          onerror: (e) => console.error('Live Assistant Error:', e),
          onclose: () => setIsActive(false)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
    setStatus('IDLE');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-tajawal">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
        <button onClick={onClose} className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors z-10"><X/></button>
        
        <div className="p-10 flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isActive ? 'bg-indigo-600 scale-110' : 'bg-slate-100'}`}>
              {isConnecting ? <Loader2 className="animate-spin text-indigo-600" size={48}/> : isActive ? <Mic className="text-white animate-pulse" size={48}/> : <Bot className="text-slate-300" size={48}/>}
              {isActive && (
                <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30"></div>
              )}
            </div>
            {isActive && <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>}
          </div>

          <div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">مساعدك الصوتي المباشر</h3>
            <p className="text-sm text-gray-500 font-bold px-10">يمكنك التحدث معي الآن للتحكم في الفصل، رصد الغياب، أو طلب معلومات عن الطلاب.</p>
          </div>

          <div className="w-full bg-slate-50 p-6 rounded-[2rem] border border-slate-100 min-h-[100px] flex flex-col items-center justify-center gap-4">
             {status === 'IDLE' && <p className="text-gray-400 text-sm italic">اضغط على الزر أدناه للبدء</p>}
             {status === 'LISTENING' && <div className="flex gap-1 items-center"><div className="w-1.5 h-6 bg-indigo-400 animate-bounce"></div><div className="w-1.5 h-10 bg-indigo-600 animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-4 bg-indigo-400 animate-bounce [animation-delay:0.4s]"></div><p className="mr-3 text-indigo-600 font-black">أسمعك...</p></div>}
             {status === 'THINKING' && <Loader2 className="animate-spin text-purple-600"/>}
             {status === 'SPEAKING' && <div className="flex items-center gap-2 text-indigo-600 font-black"><Volume2 className="animate-pulse"/> جاري الرد...</div>}
          </div>

          <div className="w-full space-y-3 text-center">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest justify-center mb-2">
                <Command size={12}/> أمثلة للأوامر
             </div>
             <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-100">"سجل غياب أحمد محمد"</span>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">"أعطي سارة 10 نقاط للمشاركة"</span>
             </div>
          </div>

          <button 
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isActive ? 'bg-red-50 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isActive ? <MicOff size={24}/> : <Sparkles size={24}/>}
            {isActive ? 'إنهاء الجلسة' : 'بدء المساعد الصوتي'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveAssistant;
