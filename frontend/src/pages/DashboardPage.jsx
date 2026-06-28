import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Brain, Briefcase, ClipboardList, ArrowRight, CheckCircle2, Circle, TrendingUp, Zap } from 'lucide-react';
import { useAuthStore } from '../store/auth.store.js';
import { cvAPI, assessmentAPI, applicationAPI } from '../services/api.js';

const steps = [
  { key: 'cv',          icon: FileText,      label: 'Upload & Enhance CV',     desc: 'AI rewrites your CV for ATS',           to: '/cv',           color: 'blue'   },
  { key: 'assessment',  icon: Brain,         label: 'Complete Skills Assessment', desc: 'Verify your skills with AI proctoring', to: '/assessment',   color: 'purple' },
  { key: 'jobs',        icon: Briefcase,     label: 'Get Job Matches',          desc: 'AI matches you to top opportunities',   to: '/jobs',         color: 'green'  },
  { key: 'applications',icon: ClipboardList, label: 'Track Applications',       desc: 'Dashboard to manage everything',        to: '/applications', color: 'orange' },
];

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-100 text-blue-700'   },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  badge: 'bg-green-100 text-green-700'  },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ cvReady: false, assessmentPassed: false, totalApplications: 0, matchCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cvsRes, assessRes, appRes] = await Promise.allSettled([
          cvAPI.list(),
          assessmentAPI.list(),
          applicationAPI.list(),
        ]);

        const cvs         = cvsRes.status === 'fulfilled' ? cvsRes.value.data : [];
        const assessments = assessRes.status === 'fulfilled' ? assessRes.value.data : [];
        const appData     = appRes.status === 'fulfilled' ? appRes.value.data : { applications: [], stats: {} };

        setStats({
          cvReady:           cvs.some(c => c.status === 'READY'),
          assessmentPassed:  assessments.some(a => a.passed),
          totalApplications: appData.stats?.total || 0,
          interviews:        appData.stats?.interview || 0,
          offers:            appData.stats?.offer || 0,
          latestCvScore:     cvs.find(c => c.status === 'READY')?.atsScore || null,
          latestAssessment:  assessments.find(a => a.status === 'COMPLETED') || null,
        });
      } catch (e) { /* fail silently */ }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const completedSteps = [
    stats.cvReady,
    stats.assessmentPassed,
    stats.totalApplications > 0,
    stats.totalApplications > 0,
  ].filter(Boolean).length;

  const progressPct = Math.round((completedSteps / 4) * 100);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Here's your career journey overview.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">{progressPct}% Complete</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Your Career Journey</span>
          <span className="text-xs text-gray-500">{completedSteps} / 4 steps completed</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s, i) => {
            const done = [stats.cvReady, stats.assessmentPassed, stats.totalApplications > 0, stats.totalApplications > 0][i];
            return (
              <div key={s.key} className="flex flex-col items-center gap-1">
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                  : <Circle className="w-4 h-4 text-gray-300" />}
                <span className="text-xs text-gray-500 text-center hidden sm:block">{s.label.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ATS Score',     value: stats.latestCvScore ? `${stats.latestCvScore}%` : '—', sub: 'CV compatibility',       color: 'text-blue-600'  },
          { label: 'Skill Score',   value: stats.latestAssessment?.score ? `${Math.round(stats.latestAssessment.score)}%` : '—', sub: 'Latest assessment', color: 'text-purple-600' },
          { label: 'Applications',  value: stats.totalApplications,  sub: 'Jobs applied',           color: 'text-green-600'  },
          { label: 'Interviews',    value: stats.interviews || 0,      sub: 'Scheduled',              color: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display font-bold text-3xl mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm font-semibold text-gray-800">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Journey steps */}
      <div>
        <h2 className="font-display font-semibold text-lg text-gray-900 mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {steps.map((step, i) => {
            const done = [stats.cvReady, stats.assessmentPassed, stats.totalApplications > 0, stats.totalApplications > 0][i];
            const c = colorMap[step.color];
            const Icon = step.icon;
            return (
              <Link
                key={step.key}
                to={step.to}
                className={`card p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${done ? 'opacity-75' : ''}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-gray-900">{step.label}</span>
                    {done && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI tip banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-1">Pro Tip</p>
          <p className="text-blue-100 text-sm">Complete all 4 steps to unlock your personalized job matches and get your profile seen by top employers.</p>
        </div>
        <Link to="/cv" className="flex-shrink-0 bg-white text-blue-600 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          Start Now
        </Link>
      </div>
    </div>
  );
}
