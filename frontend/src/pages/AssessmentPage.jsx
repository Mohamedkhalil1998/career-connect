import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Brain, Camera, Mic, AlertTriangle, CheckCircle2, XCircle,
  Clock, ChevronRight, Loader2, Shield, Eye, BarChart3
} from 'lucide-react';
import { assessmentAPI, profileAPI } from '../services/api.js';

/* ── Proctoring hook ── */
function useProctoring(assessmentId, active) {
  const streamRef    = useRef(null);
  const intervalRef  = useRef(null);
  const violations   = useRef([]);

  const reportViolation = useCallback(async (type, data = {}) => {
    violations.current.push({ type, timestamp: Date.now() });
    if (assessmentId) {
      try { await assessmentAPI.proctor(assessmentId, { event: type, data }); } catch {}
    }
  }, [assessmentId]);

  useEffect(() => {
    if (!active) return;

    // Tab visibility
    const handleVisibility = () => {
      if (document.hidden) reportViolation('TAB_SWITCH', { time: new Date().toISOString() });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Copy-paste prevention
    const handleCopy = () => reportViolation('COPY_ATTEMPT');
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopy);
    };
  }, [active, reportViolation]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      return stream;
    } catch {
      toast.error('Camera/microphone access required for assessment');
      return null;
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return { startCamera, stopCamera, violations: violations.current, reportViolation };
}

/* ── Question Components ── */
const MCQuestion = ({ q, answer, setAnswer }) => (
  <div className="space-y-3">
    {q.options?.map((opt, i) => (
      <button
        key={i}
        onClick={() => setAnswer(opt)}
        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
          answer === opt
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-100 hover:border-gray-200 bg-white text-gray-700'
        }`}
      >
        <span className="font-bold mr-3 text-gray-400">{['A','B','C','D'][i]}.</span>{opt}
      </button>
    ))}
  </div>
);

const OpenQuestion = ({ answer, setAnswer }) => (
  <textarea
    value={answer || ''}
    onChange={e => setAnswer(e.target.value)}
    rows={6}
    placeholder="Write your detailed answer here…"
    className="input resize-none text-sm"
  />
);

const CodingQuestion = ({ q, answer, setAnswer }) => (
  <div className="space-y-3">
    {q.testCases?.length > 0 && (
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2 font-mono">// Test cases</p>
        {q.testCases.map((tc, i) => (
          <p key={i} className="text-xs font-mono text-green-400">
            Input: {tc.input} → Expected: {tc.output}
          </p>
        ))}
      </div>
    )}
    <textarea
      value={answer || ''}
      onChange={e => setAnswer(e.target.value)}
      rows={10}
      placeholder="// Write your solution here…"
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-900 text-green-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      spellCheck={false}
    />
  </div>
);

/* ── Main Page ── */
export default function AssessmentPage() {
  const [phase, setPhase]           = useState('intro');   // intro | setup | taking | results
  const [profile, setProfile]       = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [currentQ, setCurrentQ]     = useState(0);
  const [timeLeft, setTimeLeft]     = useState(0);
  const [results, setResults]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraOk, setCameraOk]     = useState(false);
  const [stream, setStream]         = useState(null);
  const videoRef  = useRef(null);
  const timerRef  = useRef(null);

  const { startCamera, stopCamera, violations, reportViolation } = useProctoring(
    assessment?.id, phase === 'taking'
  );

  useEffect(() => {
    profileAPI.get().then(r => setProfile(r.data)).catch(() => {});
    assessmentAPI.list().then(r => {
      const completed = r.data.find(a => a.status === 'COMPLETED');
      if (completed) setPhase('done');
    }).catch(() => {});
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'taking' || !timeLeft) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleCameraSetup = async () => {
    const s = await startCamera();
    if (s) {
      setStream(s);
      setCameraOk(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleStartAssessment = async () => {
    if (!cameraOk) { toast.error('Please allow camera access first'); return; }
    try {
      const skills = profile?.skills?.length ? profile.skills : ['JavaScript', 'React', 'Problem Solving'];
      const jobTitle = profile?.jobTitle || 'Software Developer';

      const { data } = await assessmentAPI.create({ jobTitle, skills });
      setAssessment(data.assessment);

      const started = await assessmentAPI.start(data.assessment.id);
      const qs = started.data.questions || [];
      setQuestions(qs);
      setTimeLeft((data.assessment.meta?.estimatedMinutes || 25) * 60);
      setPhase('taking');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start assessment');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    stopCamera();
    try {
      const { data } = await assessmentAPI.submit(assessment.id, { answers });
      setResults(data);
      setPhase('results');
    } catch (err) {
      toast.error('Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  /* ── INTRO ── */
  if (phase === 'intro') return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Skills Assessment</h1>
        <p className="text-gray-500 text-sm mt-1">Verify your skills to unlock AI job matching</p>
      </div>
      <div className="card p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
          <Brain className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="font-display font-bold text-xl text-gray-900 mb-3">Ready to verify your skills?</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Take a proctored AI-generated assessment based on your CV skills. Your camera and microphone will be active to ensure integrity.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          {[
            { icon: Clock,   label: '~25 min',  desc: 'Duration'   },
            { icon: Brain,   label: '10 Qs',    desc: 'Questions'  },
            { icon: Shield,  label: 'Proctored', desc: 'Monitored' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={desc} className="bg-gray-50 rounded-xl p-4">
              <Icon className="w-5 h-5 text-gray-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Before you start:</p>
            <ul className="space-y-1 text-xs">
              <li>• Camera & microphone access required</li>
              <li>• Do not switch tabs — it will be recorded</li>
              <li>• Complete in one sitting</li>
              <li>• Minimum passing score: 60%</li>
            </ul>
          </div>
        </div>
        <button onClick={() => setPhase('setup')} className="btn-primary w-full flex items-center justify-center gap-2">
          Continue to Setup <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  /* ── CAMERA SETUP ── */
  if (phase === 'setup') return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-gray-900">Camera Setup</h1>
      <div className="card p-6">
        <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-5 relative">
          {stream
            ? <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
            : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Camera className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm">Camera not started</p>
              </div>
            )}
          {cameraOk && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`flex items-center gap-3 p-3 rounded-xl ${cameraOk ? 'bg-green-50' : 'bg-gray-50'}`}>
            <Camera className={`w-5 h-5 ${cameraOk ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs font-semibold text-gray-700">Camera</p>
              <p className="text-xs text-gray-400">{cameraOk ? 'Connected' : 'Not connected'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${cameraOk ? 'bg-green-50' : 'bg-gray-50'}`}>
            <Mic className={`w-5 h-5 ${cameraOk ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs font-semibold text-gray-700">Microphone</p>
              <p className="text-xs text-gray-400">{cameraOk ? 'Connected' : 'Not connected'}</p>
            </div>
          </div>
        </div>

        {!cameraOk ? (
          <button onClick={handleCameraSetup} className="btn-primary w-full flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> Allow Camera & Microphone
          </button>
        ) : (
          <button onClick={handleStartAssessment} className="btn-primary w-full flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" /> Start Assessment
          </button>
        )}
      </div>
    </div>
  );

  /* ── ASSESSMENT TAKING ── */
  if (phase === 'taking' && questions.length > 0) {
    const q = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;
    const isLast = currentQ === questions.length - 1;
    const typeColor = { multiple_choice: 'blue', open_ended: 'purple', coding: 'green' }[q.type] || 'gray';

    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-slide-up">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <video ref={videoRef} className="w-10 h-10 rounded-full object-cover border-2 border-green-400" muted autoPlay playsInline />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Proctored Session</p>
              <p className="text-xs text-gray-400">Q {currentQ + 1} / {questions.length}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${
            timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'
          }`}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Question */}
        <div className="card p-6">
          <div className="flex items-start gap-3 mb-5">
            <span className={`badge bg-${typeColor}-100 text-${typeColor}-700 capitalize`}>
              {q.type?.replace('_', ' ')}
            </span>
            <span className={`badge ${
              q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            } capitalize`}>
              {q.difficulty}
            </span>
            <span className="badge bg-gray-100 text-gray-600">{q.skill}</span>
          </div>

          <h2 className="font-semibold text-gray-900 mb-5 text-base leading-relaxed">{q.question}</h2>

          {q.type === 'multiple_choice' && (
            <MCQuestion q={q} answer={answers[q.id]} setAnswer={a => setAnswers(prev => ({ ...prev, [q.id]: a }))} />
          )}
          {q.type === 'open_ended' && (
            <OpenQuestion answer={answers[q.id]} setAnswer={a => setAnswers(prev => ({ ...prev, [q.id]: a }))} />
          )}
          {q.type === 'coding' && (
            <CodingQuestion q={q} answer={answers[q.id]} setAnswer={a => setAnswers(prev => ({ ...prev, [q.id]: a }))} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(i => Math.max(0, i - 1))}
            disabled={currentQ === 0}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            ← Previous
          </button>

          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                  i === currentQ ? 'bg-blue-600 text-white' :
                  answers[questions[i].id] ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary text-sm flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit Assessment
            </button>
          ) : (
            <button onClick={() => setCurrentQ(i => i + 1)} className="btn-primary text-sm">
              Next →
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULTS ── */
  if (phase === 'results' && results) {
    const passed = results.passed;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
        <div className={`card p-8 text-center ${passed ? 'border-green-200' : 'border-red-200'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {passed
              ? <CheckCircle2 className="w-10 h-10 text-green-600" />
              : <XCircle className="w-10 h-10 text-red-500" />}
          </div>
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">
            {passed ? 'Assessment Passed! 🎉' : 'Assessment Not Passed'}
          </h2>
          <div className={`text-5xl font-display font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {Math.round(results.score)}%
          </div>
          <p className="text-gray-500 text-sm mb-6">{passed ? 'Your skills are now verified' : 'Minimum passing score is 60%'}</p>

          {/* Skill scores */}
          {results.skillScores && (
            <div className="text-left mb-6">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Skill Breakdown
              </h3>
              <div className="space-y-2">
                {Object.entries(results.skillScores).map(([skill, score]) => (
                  <div key={skill}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{skill}</span>
                      <span className="text-gray-500">{Math.round(score)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${score >= 60 ? 'bg-green-500' : 'bg-red-400'}`}
                        style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.strengths?.length > 0 && (
            <div className="text-left bg-green-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-green-800 mb-2">✓ Verified Skills</p>
              <div className="flex flex-wrap gap-2">
                {results.verifiedSkills?.map(s => (
                  <span key={s} className="badge bg-green-100 text-green-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          <a href="/jobs" className="btn-primary w-full flex items-center justify-center gap-2">
            {passed ? 'View My Job Matches' : 'Retake Assessment'} <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  /* ── ALREADY DONE ── */
  if (phase === 'done') return (
    <div className="max-w-xl mx-auto">
      <div className="card p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="font-display font-bold text-xl text-gray-900 mb-2">Assessment Complete</h2>
        <p className="text-gray-500 text-sm mb-6">Your skills are verified. Check your matched jobs!</p>
        <a href="/jobs" className="btn-primary inline-flex items-center gap-2">
          View Job Matches <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );

  return <div className="flex items-center justify-center min-h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
}
