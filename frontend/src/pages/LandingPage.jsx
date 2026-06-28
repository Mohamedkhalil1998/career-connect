import { Link } from 'react-router-dom';
import { Zap, ArrowRight, CheckCircle2, Brain, FileText, Briefcase, BarChart3 } from 'lucide-react';

const features = [
  { icon: FileText, title: 'ATS-Optimized CV', desc: 'Upload your CV and our AI rewrites it to pass any Applicant Tracking System with a compatibility score.' },
  { icon: Brain,    title: 'Skills Assessment', desc: 'Take a proctored AI exam to verify your real skills. No more guessing — companies see only verified talent.' },
  { icon: Briefcase, title: 'Smart Job Matching', desc: 'We scrape jobs from Wuzzuf, LinkedIn, Indeed, and more — then match them to your verified skills with AI.' },
  { icon: BarChart3, title: 'Application Tracker', desc: 'One dashboard to track every application, every status update, and every response in real time.' },
];

const steps = [
  { num: '01', title: 'Upload Your CV', desc: 'Drop your existing CV. Our AI enhances it to be fully ATS-compatible instantly.' },
  { num: '02', title: 'Verify Your Skills', desc: 'Take a short, proctored assessment. Your verified skills become your career passport.' },
  { num: '03', title: 'Get Matched', desc: 'AI scans thousands of jobs across all major platforms and surfaces your top 5+ matches.' },
  { num: '04', title: 'Apply & Track', desc: 'Apply with one click, generate a cover letter instantly, and track every application.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl">Career<span className="text-blue-600">Connect</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 text-sm text-blue-700 font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            AI-Powered Job Matching Platform
          </div>
          <h1 className="font-display font-bold text-5xl md:text-7xl text-gray-900 leading-tight tracking-tight mb-6">
            Land Your Dream Job<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              With Verified Skills
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Career Connect uses AI to enhance your CV, verify your skills through a proctored assessment, and match you with the best job opportunities across all major platforms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 text-base">
              Start For Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-base">
              Sign In
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-500">
            {['Free to start', 'AI-powered matching', 'Proctored assessment', 'All job platforms'].map(t => (
              <span key={t} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '70%', label: 'Faster hiring' },
            { num: '10K+', label: 'Jobs aggregated' },
            { num: '95%', label: 'ATS pass rate' },
            { num: '3×', label: 'Better match rate' },
          ].map(s => (
            <div key={s.label}>
              <div className="font-display font-bold text-4xl text-blue-400 mb-2">{s.num}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">What We Do</p>
            <h2 className="font-display font-bold text-4xl text-gray-900 mb-4">Everything you need to get hired</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">One platform that takes you from an outdated CV to matched, verified, and hired.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-5 p-8 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-display font-bold text-4xl text-gray-900 mb-4">From upload to hired in 4 steps</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-blue-100 flex items-center justify-center mb-5 shadow-sm">
                  <span className="font-display font-bold text-blue-600">{step.num}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent -translate-x-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-purple-700 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-bold text-4xl mb-4">Ready to find your next role?</h2>
          <p className="text-blue-100 text-lg mb-10">Join thousands of professionals who found better jobs faster with Career Connect.</p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-10 py-4 rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 text-base">
            Get Started — It's Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="font-display font-bold text-white">Career<span className="text-blue-500">Connect</span></span>
          </div>
          <p className="text-sm">© 2025 CareerConnect. All rights reserved.</p>
          <p className="text-sm">contact@careerconnect.ai</p>
        </div>
      </footer>
    </div>
  );
}
