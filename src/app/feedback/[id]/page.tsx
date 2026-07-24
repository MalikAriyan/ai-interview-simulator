'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import {
  Award,
  RotateCcw,
  LayoutDashboard,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface EvaluationReport {
  overall_score: number;
  technical_accuracy_score: number;
  communication_score: number;
  problem_solving_score: number;
  key_strengths: string[];
  areas_for_improvement: string[];
  detailed_feedback: string;
}

export default function InterviewFeedback() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationReport | null>(null);

  useEffect(() => {
    setIsClient(true);

    const fetchEvaluation = async () => {
      setLoading(true);
      setErrorMsg(null);

      // Fetch transcript from local storage
      let localTranscript = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`interview_transcript_${id}`);
        if (stored) {
          try {
            localTranscript = JSON.parse(stored);
          } catch (e) {
            console.error('Failed to parse local transcript', e);
          }
        }
      }

      try {
        const res = await fetch('/api/interview/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interview_id: id, transcript: localTranscript })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setEvaluation(data);

        // Real-time Dashboard Sync: update interview status and score locally
        if (typeof window !== 'undefined') {
          const storedSessions = localStorage.getItem('interview_sessions');
          if (storedSessions) {
            try {
              const sessions = JSON.parse(storedSessions);
              const idx = sessions.findIndex((s: { id: string }) => s.id === id);
              if (idx !== -1) {
                sessions[idx].status = 'completed';
                sessions[idx].score = data.overall_score;
                localStorage.setItem('interview_sessions', JSON.stringify(sessions));
              } else {
                const newSession = {
                  id: id,
                  role: 'Frontend Dev',
                  level: 'Senior',
                  status: 'completed',
                  created_at: new Date().toISOString(),
                  score: data.overall_score
                };
                localStorage.setItem('interview_sessions', JSON.stringify([newSession, ...sessions]));
              }
            } catch (e) {
              console.error('Local history sync failed:', e);
            }
          }
        }

        // Real-time Dashboard Sync: update interview status and score in Supabase
        try {
          await supabase
            .from('interviews')
            .update({
              status: 'completed',
              score: data.overall_score
            })
            .eq('id', id);
        } catch (dbErr) {
          console.warn('Supabase evaluation sync failed (bypassed):', dbErr);
        }
      } catch (err: unknown) {
        console.error(err);
        setErrorMsg('Failed to process AI evaluation. Please verify your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [id]);

  // Recharts Chart Data formatting
  const chartData = evaluation
    ? [
        { subject: 'Technical Depth', score: evaluation.technical_accuracy_score, fullMark: 100 },
        { subject: 'Communication', score: evaluation.communication_score, fullMark: 100 },
        { subject: 'Problem Solving', score: evaluation.problem_solving_score, fullMark: 100 }
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Generating Evaluation Report...</h2>
        <p className="text-sm text-zinc-500 max-w-xs text-center">
          Gemini is analyzing your transcription answers and scoring performance metrics.
        </p>
      </div>
    );
  }

  if (errorMsg || !evaluation) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-5 max-w-md text-red-200">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold">Evaluation Error</h2>
          <p className="text-sm text-zinc-400 mt-1">{errorMsg || 'Evaluation data was not generated.'}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-4">
      {/* Header Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -z-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"></div>
        
        <div className="grid gap-8 md:grid-cols-3 items-center">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-emerald-500/30 bg-zinc-900 shadow-[0_0_35px_rgba(16,185,129,0.15)]">
              <div className="flex flex-col items-center">
                <span className="text-4xl font-extrabold text-white">{evaluation.overall_score}%</span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Overall</span>
              </div>
            </div>
            <span className="mt-4 text-sm font-semibold text-zinc-300">
              {evaluation.overall_score >= 80 ? 'Verdict: Strong Pass' : evaluation.overall_score >= 60 ? 'Verdict: Pass' : 'Verdict: Needs Work'}
            </span>
          </div>

          {/* AI Score description */}
          <div className="md:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Award className="h-3.5 w-3.5" />
              Evaluation Report
            </div>
            
            <h2 className="text-2xl font-extrabold text-white md:text-3xl">
              Performance Review
            </h2>
            
            <p className="text-zinc-400 text-sm leading-relaxed">
              {evaluation.detailed_feedback}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Radar Chart Panel */}
        <div className="lg:col-span-1 border border-zinc-800 bg-zinc-900/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Metrics Breakdown
            </h3>
            <p className="text-xs text-zinc-500">Visual comparison of core interview competencies</p>
          </div>

          {/* Radar Chart Container */}
          <div className="h-64 w-full flex items-center justify-center">
            {isClient && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#3f3f46' }} />
                  <Radar
                    name="Competency"
                    dataKey="score"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.25}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-6 border-t border-zinc-850">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-950/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Practice Session</span>
            </button>
          </div>
        </div>

        {/* Strengths and Improvement Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Strengths */}
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/2 p-6 md:p-8 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Key Strengths
            </h3>
            
            <ul className="space-y-3">
              {evaluation.key_strengths.map((str, index) => (
                <li key={index} className="flex gap-2.5 text-sm text-zinc-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/2 p-6 md:p-8 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Areas for Improvement
            </h3>

            <ul className="space-y-3">
              {evaluation.areas_for_improvement.map((imp, index) => (
                <li key={index} className="flex gap-2.5 text-sm text-zinc-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-950 text-amber-400 text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
