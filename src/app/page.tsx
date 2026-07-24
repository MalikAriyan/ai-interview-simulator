import Link from 'next/link';
import { ArrowRight, Brain, Sparkles, Shield, Speech } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center justify-center py-12 md:py-20 overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl md:h-[450px] md:w-[450px]"></div>

      {/* Hero Header */}
      <div className="text-center max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm font-semibold text-emerald-400">
          <Sparkles className="h-4 w-4" />
          <span>Next-Generation AI Interview Prep</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-clip-text bg-gradient-to-b from-white to-zinc-400">
          Master Your Next Interview with Adaptive AI
        </h1>
        
        <p className="mx-auto max-w-2xl text-lg text-zinc-400 md:text-xl">
          Practice technical and behavioral questions in a realistic, real-time environment. Get detailed audio and text analytics powered by Gemini.
        </p>

        {/* CTA Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-650 px-6 py-3.5 text-base font-semibold text-white shadow-xl hover:from-emerald-400 hover:to-teal-555 hover:shadow-emerald-500/10 active:scale-95 transition-all duration-200"
          >
            <span>Start Simulating Now</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          
          <a
            href="#features"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-3.5 text-base font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="mt-24 md:mt-32 w-full max-w-6xl space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Built for High-Growth Careers
          </h2>
          <p className="text-zinc-400">
            A comprehensive suite of tools to take the stress out of live technical coding tests.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Adaptive AI Prompts</h3>
            <p className="text-sm leading-relaxed text-zinc-400">
              Our AI dynamically adjusts questions based on your response history, chosen role, and difficulty level.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Speech className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Transcription Feedback</h3>
            <p className="text-sm leading-relaxed text-zinc-400">
              Get detailed performance analytics including grammar ratings, technical accuracy scorecards, and model answer recommendations.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 hover:border-emerald-500/30 transition-all duration-300 col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Supabase Sync</h3>
            <p className="text-sm leading-relaxed text-zinc-400">
              All interview profiles, sessions, and history logs are synced securely with your private account database.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
