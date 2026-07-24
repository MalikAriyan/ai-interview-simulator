'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  Video,
  VideoOff,
  Clock,
  Sparkles,
  LogOut,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ChatMessage {
  sender: 'ai' | 'user';
  message: string;
  timestamp: Date;
}

export default function InterviewRoom() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const id = params.id as string;
  const targetRole = searchParams.get('role') || 'React Frontend Developer';
  const targetLevel = searchParams.get('level') || 'Senior';

  // State variables
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userResponse, setUserResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [timeRemaining, setTimeRemaining] = useState(900); // 15:00 minutes countdown
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(true);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Audio Visualizer References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Web Audio Visualizer Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);

      if (isRecording && analyserRef.current) {
        // Render real mic frequencies
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(9, 9, 11, 0.4)';
        ctx.fillRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.2;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 1.8;

          // Gradient color transition (emerald to teal)
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, '#10b981');
          grad.addColorStop(1, '#06b6d4');

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }
      } else if (isAISpeaking) {
        // Draw elegant fluid sine wave matching AI speech synthesis
        ctx.fillStyle = 'rgba(9, 9, 11, 0.4)';
        ctx.fillRect(0, 0, width, height);

        const time = Date.now() * 0.005;
        
        // Secondary wave
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.015 - time * 0.8) * 14 * Math.cos(time * 0.3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Primary wave
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.02 + time) * 22 * Math.sin(time * 0.4);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Idle waveform flat line
        ctx.fillStyle = 'rgba(9, 9, 11, 0.4)';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isRecording, isAISpeaking]);

  // Hook Web Audio Context for mic inputs
  useEffect(() => {
    const startAudioContext = async () => {
      if (isRecording) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; 

          source.connect(analyser);
          analyserRef.current = analyser;
        } catch (err) {
          console.error('Failed to configure audio context:', err);
        }
      } else {
        cleanupAudio();
      }
    };

    startAudioContext();

    return () => {
      cleanupAudio();
    };
  }, [isRecording]);

  const cleanupAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  // Initialize Speech Recognition & Greeting
  useEffect(() => {
    // 1. Initialize Web Speech API Recognition
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsRecording(true);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setUserResponse((prev) => prev + (prev ? ' ' : '') + finalTranscript);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }

    // 2. Start Countdown Timer (15:00 down to 00:00)
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Conclude interview automatically when timer reaches zero
          handleEndInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3. Fetch Initial Question
    const fetchGreeting = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const resumeText = typeof window !== 'undefined' ? localStorage.getItem('candidate_resume') || '' : '';
        const res = await fetch('/api/interview/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: targetRole, level: targetLevel, history: [], resumeText })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const greeting = data.text;
        const initialMsg: ChatMessage = { sender: 'ai', message: greeting, timestamp: new Date() };
        setChatHistory([initialMsg]);
        localStorage.setItem(`interview_transcript_${id}`, JSON.stringify([initialMsg]));
        
        speakAIResponse(greeting);
      } catch (err: unknown) {
        console.error(err);
        setErrorMsg('Failed to load the initial greeting. Please check your config or keys.');
      } finally {
        setLoading(false);
      }
    };

    fetchGreeting();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, targetLevel, id]);

  // Autoscroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  // Text-To-Speech Auto-Play with Speech synthesis status events
  const speakAIResponse = (text: string) => {
    if (!isTTSActive) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsAISpeaking(true);
      };
      utterance.onend = () => {
        setIsAISpeaking(false);
      };
      utterance.onerror = () => {
        setIsAISpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle TTS
  const toggleTTS = () => {
    if (isTTSActive) {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
      setIsTTSActive(false);
      setIsAISpeaking(false);
    } else {
      setIsTTSActive(true);
      const lastAI = [...chatHistory].reverse().find((m) => m.sender === 'ai');
      if (lastAI) speakAIResponse(lastAI.message);
    }
  };

  // Toggle Microphone Capturing
  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setUserResponse('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Speech start failed:', err);
      }
    }
  };

  // Submit Answer to Gemini API
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userResponse.trim() || loading) return;

    if (isRecording) {
      recognitionRef.current?.stop();
    }

    const currentAnswer = userResponse.trim();
    setUserResponse('');

    const userMsg: ChatMessage = { sender: 'user', message: currentAnswer, timestamp: new Date() };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    localStorage.setItem(`interview_transcript_${id}`, JSON.stringify(updatedHistory));

    setLoading(true);
    setErrorMsg(null);

    try {
      const resumeText = typeof window !== 'undefined' ? localStorage.getItem('candidate_resume') || '' : '';
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole, level: targetLevel, history: updatedHistory, resumeText })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiText = data.text;
      const aiMsg: ChatMessage = { sender: 'ai', message: aiText, timestamp: new Date() };
      const finalHistory = [...updatedHistory, aiMsg];
      
      setChatHistory(finalHistory);
      localStorage.setItem(`interview_transcript_${id}`, JSON.stringify(finalHistory));
      
      speakAIResponse(aiText);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Failed to receive response from Gemini. Please try typing and sending again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndInterview = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    localStorage.setItem(`interview_transcript_${id}`, JSON.stringify(chatHistory));
    router.push(`/feedback/${id}`);
  };

  // Format Elapsed Time (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const isTimeCritical = timeRemaining < 180; // Less than 3 minutes remaining

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6 py-4 max-h-[85vh]"
    >
      {/* Top Banner Control bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Live Practice: {targetRole}</h1>
            <span className="text-xs text-zinc-500">{targetLevel} Level</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6">
          {/* Glowing Countdown Timer */}
          <div
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold border transition-all duration-300 ${
              isTimeCritical
                ? 'animate-pulse border-red-500/50 bg-red-950/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeRemaining)} remaining</span>
          </div>

          {/* TTS Toggle Button */}
          <button
            onClick={toggleTTS}
            className={`p-2.5 rounded-xl border transition-colors ${
              isTTSActive 
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900/30' 
                : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'
            }`}
            title={isTTSActive ? 'Mute AI Voice Output' : 'Unmute AI Voice Output'}
          >
            {isTTSActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* End Session Button */}
          <button
            onClick={handleEndInterview}
            className="flex items-center gap-1.5 rounded-xl bg-red-950/60 border border-red-800/40 hover:bg-red-900/40 px-4 py-2 text-xs font-semibold text-red-200 transition-colors shadow-lg shadow-red-950/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-3 flex-1 overflow-hidden">
        
        {/* Left Section: Live Chat Feed with Layout morphing */}
        <motion.div
          layout
          className="lg:col-span-2 flex flex-col border border-zinc-800 bg-zinc-900/10 rounded-2xl overflow-hidden min-h-[400px]"
        >
          {/* Chat Feed Header */}
          <div className="border-b border-zinc-850 bg-zinc-950/40 px-6 py-3.5 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Interview Transcript</span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">Gemini AI Active</span>
          </div>

          {/* Conversation Bubble List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[450px]">
            <AnimatePresence initial={false}>
              {chatHistory.map((chat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`flex flex-col max-w-[85%] ${
                    chat.sender === 'ai' ? 'self-start' : 'self-end items-end'
                  }`}
                >
                  {/* Badge Header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {chat.sender === 'ai' ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/40">
                        AI Interviewer
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300 border border-zinc-700">
                        Candidate
                      </span>
                    )}
                    <span className="text-[9px] text-zinc-600 font-mono">
                      {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {/* Bubble message with glassmorphism */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur-md shadow-md border ${
                      chat.sender === 'ai'
                        ? 'bg-zinc-900/60 border-zinc-800/60 text-white rounded-tl-none hover:shadow-[0_0_10px_rgba(255,255,255,0.02)] transition-shadow'
                        : 'bg-emerald-600/15 border-emerald-500/25 text-emerald-100 rounded-tr-none hover:shadow-[0_0_12px_rgba(16,185,129,0.08)] transition-shadow'
                    }`}
                  >
                    {chat.message}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="self-start flex flex-col max-w-[85%]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center rounded-md bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/40 animate-pulse">
                    AI Interviewer
                  </span>
                  <span className="text-[9px] text-zinc-650">is typing...</span>
                </div>
                <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-zinc-900/40 border border-zinc-850/60 text-zinc-400 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Formulating questions...</span>
                </div>
              </motion.div>
            )}

            {errorMsg && (
              <div className="w-full text-center py-2.5 px-4 bg-red-950/20 border border-red-900/45 text-red-200 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </motion.div>

        {/* Right Section: local audio canvas visualizer & text/voice controls */}
        <motion.div
          layout
          className="lg:col-span-1 flex flex-col gap-6 shrink-0"
        >
          {/* AUDIO WAVEFORM VISUALIZER CANVAS (Replacing static video box) */}
          <div className="relative aspect-video sm:aspect-4/3 lg:aspect-video rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col justify-center items-center shrink-0">
            
            {/* Visualizer Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

            {/* Glowing avatar mask in center */}
            <div className="relative z-10 flex flex-col items-center pointer-events-none select-none">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-zinc-950 border ${
                isRecording 
                  ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                  : isAISpeaking 
                  ? 'border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'border-zinc-800'
              } transition-all duration-300`}>
                <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-black text-sm bg-gradient-to-br ${
                  isRecording 
                    ? 'from-red-500 to-pink-650' 
                    : 'from-emerald-500 to-teal-650'
                }`}>
                  {isRecording ? 'REC' : 'AI'}
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 font-semibold uppercase tracking-widest">
                {isRecording ? 'Listening to you' : isAISpeaking ? 'AI Interviewer Speaking' : 'Idle'}
              </span>
            </div>

            {/* Local Video Toggle Check (Webcam display) */}
            <div className="absolute top-2 left-2 flex gap-1 z-10 opacity-70 hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsVideoActive(!isVideoActive)}
                className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                {isVideoActive ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3 text-zinc-650" />}
              </button>
            </div>
            
            {isVideoActive && (
              <div className="absolute top-8 left-2 z-10 bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 rounded text-[8px] text-zinc-400">
                Webcam Mock Active
              </div>
            )}
          </div>

          {/* User Input controls */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4 flex-1 flex flex-col justify-between min-h-[220px]">
            <form onSubmit={handleSubmitAnswer} className="space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Your Answer</span>
                  {isRecording && (
                    <span className="text-[10px] text-red-400 font-semibold animate-pulse flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      Recording Speech...
                    </span>
                  )}
                </div>

                <textarea
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  placeholder={isRecording ? "Speak clearly into your microphone..." : "Type your answer here, or click the mic button to talk..."}
                  disabled={loading}
                  className="w-full flex-1 min-h-[100px] resize-none rounded-xl border border-zinc-850 bg-zinc-950/80 p-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 shrink-0">
                {/* PULSING RECORD MICROPHONE BUTTON */}
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  disabled={loading}
                  className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                    isRecording 
                      ? 'bg-red-950/60 border-red-500 text-red-400 animate-pulse ring-2 ring-red-500/20' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Speech Recording'}
                >
                  {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                <button
                  type="submit"
                  disabled={loading || !userResponse.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition-all disabled:opacity-40"
                >
                  <span>{loading ? 'Sending...' : 'Send Answer'}</span>
                  <Send className="h-4 w-4" />
                </button>
              </div>

            </form>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
