import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2,
  Sparkles, Download, ChevronRight, Star, AlertCircle
} from 'lucide-react';
import { cvAPI } from '../services/api.js';

const ATSScoreRing = ({ score }) => {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-xl" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400">ATS</span>
      </div>
    </div>
  );
};

const SkillBadge = ({ skill }) => (
  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
    <Star className="w-3 h-3" /> {skill}
  </span>
);

export default function CVPage() {
  const [cvs, setCvs]             = useState([]);
  const [uploading, setUploading] = useState(false);
  const [jobTitle, setJobTitle]   = useState('');
  const [polling, setPolling]     = useState(null);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    fetchCVs();
    return () => { if (polling) clearInterval(polling); };
  }, []);

  const fetchCVs = async () => {
    try {
      const { data } = await cvAPI.list();
      setCvs(data);
      const ready = data.find(c => c.status === 'READY');
      if (ready) setSelected(ready);
    } catch {}
  };

  // Poll for processing CV
  useEffect(() => {
    const processing = cvs.find(c => c.status === 'PROCESSING');
    if (processing && !polling) {
      const id = setInterval(async () => {
        try {
          const { data } = await cvAPI.get(processing.id);
          if (data.status !== 'PROCESSING') {
            setCvs(prev => prev.map(c => c.id === data.id ? data : c));
            if (data.status === 'READY') {
              toast.success('CV enhanced successfully! 🎉');
              setSelected(data);
            } else {
              toast.error('CV processing failed. Please try again.');
            }
            clearInterval(id);
            setPolling(null);
          }
        } catch {}
      }, 3000);
      setPolling(id);
    }
  }, [cvs]);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      if (jobTitle) fd.append('jobTitle', jobTitle);

      const { data } = await cvAPI.upload(fd);
      toast.success('CV uploaded! AI is enhancing it now...');
      await fetchCVs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [jobTitle]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  const parsedData = selected?.parsedData || null;

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">CV Enhancement</h1>
        <p className="text-gray-500 mt-1 text-sm">Upload your CV and our AI will rewrite it to pass any ATS system.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" /> Upload New CV
            </h2>

            <div className="mb-4">
              <label className="label">Target Job Title (optional)</label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="input text-sm"
                placeholder="e.g. Senior Frontend Developer"
              />
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive ? 'border-blue-400 bg-blue-50' :
                uploading    ? 'border-gray-200 bg-gray-50 cursor-not-allowed' :
                               'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-600">Uploading & processing…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX — max 10MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CV history */}
          {cvs.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Your CVs</h3>
              <div className="space-y-2">
                {cvs.map(cv => (
                  <button
                    key={cv.id}
                    onClick={() => cv.status === 'READY' && setSelected(cv)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected?.id === cv.id ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      cv.status === 'READY'      ? 'bg-green-100' :
                      cv.status === 'PROCESSING' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {cv.status === 'READY'      ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                       cv.status === 'PROCESSING' ? <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" /> :
                                                    <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {cv.status === 'READY' ? `ATS Score: ${cv.atsScore}%` :
                         cv.status === 'PROCESSING' ? 'Processing…' : 'Failed'}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(cv.createdAt).toLocaleDateString()}</p>
                    </div>
                    {cv.status === 'READY' && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced CV result */}
        <div className="lg:col-span-3">
          {!selected && (
            <div className="card p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-display font-semibold text-lg text-gray-700 mb-2">Upload your CV to get started</h3>
              <p className="text-gray-400 text-sm max-w-xs">Our AI will analyze and rewrite your CV to be fully ATS-compatible with a detailed score.</p>
            </div>
          )}

          {selected?.status === 'PROCESSING' && (
            <div className="card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">AI is enhancing your CV…</h3>
              <p className="text-sm text-gray-400">This usually takes 30–60 seconds. Hang tight!</p>
              <div className="mt-6 w-full max-w-xs bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {selected?.status === 'READY' && parsedData && (
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">
                      {parsedData.personalInfo?.name || `${parsedData.personalInfo?.firstName || ''} CV`}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">AI-Enhanced · ATS-Optimized</p>
                  </div>
                  <ATSScoreRing score={selected.atsScore || 0} />
                </div>
                {parsedData.improvements?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {parsedData.improvements.slice(0, 3).map((imp, i) => (
                      <span key={i} className="text-xs bg-white/20 rounded-full px-3 py-1">{imp}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-6">
                {/* Summary */}
                {parsedData.summary && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">Professional Summary</h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{parsedData.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {parsedData.skills?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map(s => <SkillBadge key={s} skill={s} />)}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {parsedData.experience?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">Experience</h3>
                    <div className="space-y-4">
                      {parsedData.experience.map((exp, i) => (
                        <div key={i} className="border-l-2 border-blue-200 pl-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{exp.title}</p>
                              <p className="text-xs text-blue-600 font-medium">{exp.company}</p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{exp.duration}</span>
                          </div>
                          {exp.bullets?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {exp.bullets.map((b, j) => (
                                <li key={j} className="text-xs text-gray-600 flex items-start gap-2">
                                  <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span> {b}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted skills alert */}
                {parsedData.extractedSkills?.length > 0 && (
                  <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Skills extracted for assessment</p>
                      <p className="text-xs text-green-600 mt-1">
                        These skills were saved to your profile: {parsedData.extractedSkills.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                <button className="btn-primary w-full flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download Enhanced CV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
