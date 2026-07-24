'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Briefcase,
  Layers,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ClipboardList,
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface MockInterview {
  id: string;
  role: string;
  level: string;
  status: 'completed' | 'in-progress';
  created_at: string;
  score?: number;
}

const INITIAL_MOCK_INTERVIEWS: MockInterview[] = [
  {
    id: 'mock-1',
    role: 'Frontend Dev',
    level: 'Senior',
    status: 'completed',
    created_at: '2026-07-20T14:30:00Z',
    score: 88,
  },
  {
    id: 'mock-2',
    role: 'Backend Engineer',
    level: 'Mid-Level',
    status: 'completed',
    created_at: '2026-07-18T10:15:00Z',
    score: 75,
  },
  {
    id: 'mock-3',
    role: 'Fullstack Dev',
    level: 'Junior',
    status: 'in-progress',
    created_at: '2026-07-22T19:00:00Z',
  }
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState('Frontend Dev');
  const [level, setLevel] = useState('Senior');
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<MockInterview[]>(INITIAL_MOCK_INTERVIEWS);

  // Resume Parsing States
  const [dragActive, setDragActive] = useState(false);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [tempResumeText, setTempResumeText] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Load Session details & local storage resume
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('candidate_resume');
      if (stored) {
        setResumeText(stored);
        setTempResumeText(stored);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Supabase resume text when user loads
  useEffect(() => {
    const fetchResume = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('resume_text')
          .eq('id', user.id)
          .single();
        
        if (data?.resume_text) {
          setResumeText(data.resume_text);
          setTempResumeText(data.resume_text);
          localStorage.setItem('candidate_resume', data.resume_text);
        }
      } catch (err) {
        console.error('Error fetching resume from database:', err);
      }
    };

    fetchResume();
  }, [user]);

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const interviewId = crypto.randomUUID();
    const newSession: MockInterview = {
      id: interviewId,
      role,
      level,
      status: 'in-progress',
      created_at: new Date().toISOString(),
    };

    if (user) {
      try {
        await supabase
          .from('interviews')
          .insert({
            id: interviewId,
            user_id: user.id,
            role,
            level,
            status: 'in-progress'
          });
      } catch (err) {
        console.error('Bypassed DB save:', err);
      }
    }

    setInterviews((prev) => [newSession, ...prev]);
    router.push(`/interview/${interviewId}?role=${encodeURIComponent(role)}&level=${encodeURIComponent(level)}`);
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  // Multimodal File Upload Handler
  const handleFileUpload = async (file: File) => {
    setUploadingResume(true);
    setUploadStatus(`Uploading and parsing ${file.name.split('.').pop()?.toUpperCase()}...`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse file.');
      }

      const parsedText = data.text;
      setResumeText(parsedText);
      setTempResumeText(parsedText);
      localStorage.setItem('candidate_resume', parsedText);
      setUploadStatus('Resume details loaded successfully!');

      if (user) {
        await supabase
          .from('profiles')
          .update({ resume_text: parsedText })
          .eq('id', user.id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('File parser error:', error);
      setUploadStatus(`Parsing failed: ${error.message || 'Error occurred'}`);
    } finally {
      setUploadingResume(false);
    }
  };

  // Direct Text Paste / Edit Save Handler
  const handleSaveResume = async () => {
    setUploadingResume(true);
    setUploadStatus('Saving resume details...');

    try {
      const text = tempResumeText.trim();
      setResumeText(text || null);
      
      if (text) {
        localStorage.setItem('candidate_resume', text);
      } else {
        localStorage.removeItem('candidate_resume');
      }

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ resume_text: text || null })
          .eq('id', user.id);
        if (error) throw error;
      }

      setUploadStatus('Resume saved successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Save failed:', error);
      setUploadStatus(`Save failed: ${error.message || 'Check database connection'}`);
    } finally {
      setUploadingResume(false);
    }
  };

  return (
    <div className="space-y-10 py-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -z-10 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl"></div>
        
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3 w-3" />
            Adaptive Learning
          </span>
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            {user ? `Welcome back, ${user.user_metadata?.full_name || 'practitioner'}!` : 'Welcome to Your Dashboard'}
          </h2>
          <p className="text-zinc-400">
            Configure your target job role, experience level, and upload your resume to practice tailored AI interview simulations.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column containing Setup and Resume Upload */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Create Interview Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 md:p-8 space-y-6 h-fit">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
              <Plus className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">New Interview Session</h3>
            </div>

            <form onSubmit={handleStartInterview} className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Briefcase className="h-3.5 w-3.5" />
                  Target Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 px-4 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Frontend Dev">Frontend Developer</option>
                  <option value="Backend Engineer">Backend Engineer</option>
                  <option value="Fullstack Dev">Fullstack Developer</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="Data Scientist">Data Scientist</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Layers className="h-3.5 w-3.5" />
                  Experience Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 px-4 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Junior">Junior (0-2 years)</option>
                  <option value="Mid-Level">Mid-Level (2-5 years)</option>
                  <option value="Senior">Senior (5+ years)</option>
                  <option value="Lead">Lead / Architect</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-950/20"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{loading ? 'Starting...' : 'Start Interview'}</span>
              </button>
            </form>
          </div>

          {/* Multimodal Resume Card with morphing spring animations */}
          <motion.div
            whileHover={{ scale: 1.015, translateY: -2 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 space-y-4 cursor-pointer transition-all duration-300 ${
              dragActive
                ? 'border-emerald-500 bg-emerald-950/15 shadow-[0_0_25px_rgba(16,185,129,0.22)]'
                : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 shadow-lg'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {/* Glow effects */}
            {dragActive && (
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_60%)]"></div>
            )}

            <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
              <UploadCloud className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Personalize with Resume</h3>
            </div>

            {/* Formats Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="rounded-md bg-zinc-950 border border-zinc-850 px-2 py-0.5 text-[9px] text-zinc-400 font-semibold">
                PDF
              </span>
              <span className="rounded-md bg-zinc-950 border border-zinc-850 px-2 py-0.5 text-[9px] text-zinc-400 font-semibold">
                DOCX
              </span>
              <span className="rounded-md bg-zinc-950 border border-zinc-850 px-2 py-0.5 text-[9px] text-zinc-400 font-semibold">
                PNG/JPG
              </span>
              <span className="rounded-md bg-zinc-950 border border-zinc-850 px-2 py-0.5 text-[9px] text-zinc-400 font-semibold">
                TXT
              </span>
            </div>

            <label className="group block relative border border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-zinc-700 bg-zinc-950/40 cursor-pointer transition-all duration-300">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                onChange={handleFileChange}
                disabled={uploadingResume}
                className="hidden"
              />
              
              {uploadingResume ? (
                <div className="flex flex-col items-center gap-2.5 py-2.5">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                  <span className="text-xs text-zinc-400 font-semibold">{uploadStatus}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-1.5">
                  <FileText className="h-8 w-8 text-zinc-500 group-hover:text-emerald-400 group-hover:scale-105 transition-all duration-300" />
                  <span className="text-xs text-zinc-400 font-medium mt-1">
                    Drag &amp; drop files here, or <span className="text-emerald-400 group-hover:underline">browse</span>
                  </span>
                  <span className="text-[10px] text-zinc-650">Supports: PDF, DOCX, Images, TXT</span>
                </div>
              )}
            </label>

            {/* Direct text editor / override paste block */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block">
                Or Paste / Edit Resume Details
              </label>
              <textarea
                value={tempResumeText}
                onChange={(e) => setTempResumeText(e.target.value)}
                placeholder="Paste key projects, technical languages, libraries, and tools from your resume here to tailor AI questions directly..."
                className="w-full h-32 resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleSaveResume}
                disabled={uploadingResume}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-55 shadow-md shadow-emerald-950/10"
              >
                Save Changes
              </button>

              {uploadStatus && !uploadingResume && (
                <span className={`text-xs font-semibold ${
                  uploadStatus.includes('successfully') ? 'text-emerald-400' : 'text-zinc-500'
                }`}>
                  {uploadStatus}
                </span>
              )}
            </div>

            {/* If resume is loaded, show success status check card */}
            <AnimatePresence>
              {resumeText && !uploadingResume && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-emerald-950 bg-emerald-950/10 p-3 space-y-2 flex flex-col cursor-default"
                  onClick={(e) => e.stopPropagation()} // Prevent trigger upload click
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Resume details loaded successfully!</span>
                  </div>
                  <p className="text-[10px] text-zinc-550 font-mono line-clamp-2 leading-relaxed">
                    {resumeText}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>

        {/* History / Sessions Panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 md:p-8 space-y-6 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <ClipboardList className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Simulated Session History</h3>
          </div>

          <div className="space-y-4">
            {interviews.map((session) => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-850 bg-zinc-900/20 p-5 hover:bg-zinc-900/40 hover:border-zinc-800 transition-all duration-200 gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{session.role}</span>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                      {session.level}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      {session.status === 'completed' ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className="capitalize">{session.status}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end border-t border-zinc-800 pt-3 sm:border-0 sm:pt-0">
                  {session.status === 'completed' && session.score !== undefined && (
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-medium">Evaluation Score</div>
                      <div className="text-lg font-extrabold text-emerald-400">{session.score}%</div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (session.status === 'completed') {
                        router.push(`/feedback/${session.id}`);
                      } else {
                        router.push(`/interview/${session.id}?role=${encodeURIComponent(session.role)}&level=${encodeURIComponent(session.level)}`);
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
                  >
                    <span>{session.status === 'completed' ? 'View Results' : 'Resume'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
