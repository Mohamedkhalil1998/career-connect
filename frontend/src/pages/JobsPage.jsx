import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Briefcase, MapPin, Clock, ExternalLink, Zap, Loader2,
  Search, Filter, BookmarkPlus, FileText, X, Copy, CheckCircle2, Star
} from 'lucide-react';
import { jobAPI, applicationAPI } from '../services/api.js';

const sourceColors = {
  wuzzuf:   { bg: 'bg-orange-100', text: 'text-orange-700' },
  linkedin: { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  indeed:   { bg: 'bg-purple-100', text: 'text-purple-700' },
  adzuna:   { bg: 'bg-green-100',  text: 'text-green-700'  },
  default:  { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

const ScoreCircle = ({ score }) => {
  const color = score >= 85 ? 'text-green-600' : score >= 70 ? 'text-blue-600' : 'text-yellow-600';
  const bg    = score >= 85 ? 'bg-green-50 border-green-200' : score >= 70 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';
  return (
    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 ${bg} flex-shrink-0`}>
      <span className={`font-display font-bold text-base leading-none ${color}`}>{Math.round(score)}</span>
      <span className="text-xs text-gray-400 mt-0.5">match</span>
    </div>
  );
};

const CoverLetterModal = ({ job, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [letter, setLetter]   = useState('');
  const [copied, setCopied]   = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await applicationAPI.coverLetter({ jobId: job.id });
      setLetter(data.coverLetter);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate cover letter');
    } finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  useEffect(() => { generate(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-900">Cover Letter</h2>
            <p className="text-sm text-gray-500">{job.title} at {job.company}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">AI is writing your cover letter…</p>
            </div>
          ) : (
            <textarea
              value={letter}
              onChange={e => setLetter(e.target.value)}
              rows={18}
              className="w-full text-sm text-gray-700 leading-relaxed border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          )}
        </div>
        {letter && (
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button onClick={copy} className="btn-secondary flex items-center gap-2 text-sm flex-1">
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={generate} className="btn-ghost text-sm">Regenerate</button>
          </div>
        )}
      </div>
    </div>
  );
};

const JobCard = ({ job, isMatch, onApply, onCoverLetter, appliedIds }) => {
  const src = sourceColors[job.source] || sourceColors.default;
  const applied = appliedIds.has(job.id);

  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {isMatch && job.matchScore && <ScoreCircle score={job.matchScore} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">{job.title}</h3>
              <p className="text-blue-600 text-xs font-medium mt-0.5">{job.company}</p>
            </div>
            <span className={`badge ${src.bg} ${src.text} flex-shrink-0 capitalize text-xs`}>
              {job.source}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
            {job.type     && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.type}</span>}
            {job.salary   && <span className="font-medium text-gray-600">{job.salary}</span>}
          </div>

          {isMatch && job.matchedSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.matchedSkills.slice(0, 4).map(s => (
                <span key={s} className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 font-medium">
                  ✓ {s}
                </span>
              ))}
              {job.missingSkills?.slice(0, 2).map(s => (
                <span key={s} className="text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
                  ✗ {s}
                </span>
              ))}
            </div>
          )}

          {isMatch && job.reasons?.[0] && (
            <p className="text-xs text-gray-500 mt-2 italic">"{job.reasons[0]}"</p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => onApply(job)}
              disabled={applied}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                applied
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {applied ? '✓ Applied' : 'Quick Apply'}
            </button>
            <button
              onClick={() => onCoverLetter(job)}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3 h-3" /> Cover Letter
            </button>
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function JobsPage() {
  const [tab, setTab]             = useState('matches');
  const [matches, setMatches]     = useState([]);
  const [allJobs, setAllJobs]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [coverJob, setCoverJob]   = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  useEffect(() => {
    if (tab === 'matches') loadMatches();
    else loadAllJobs();
  }, [tab]);

  useEffect(() => {
    // Load applied
    import('../services/api.js').then(({ applicationAPI }) => {
      applicationAPI.list().then(r => {
        const ids = new Set((r.data.applications || []).map(a => a.jobId));
        setAppliedIds(ids);
      }).catch(() => {});
    });
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const { data } = await jobAPI.matches();
      setMatches(data.matches || []);
    } catch (err) {
      if (err.response?.status === 400) {
        toast('Complete your CV and assessment first to unlock AI matching', { icon: 'ℹ️' });
      } else {
        toast.error('Failed to load matches');
      }
    } finally { setLoading(false); }
  };

  const loadAllJobs = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await jobAPI.list({ search, page, limit: 20 });
      setAllJobs(data.jobs || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load jobs'); }
    finally { setLoading(false); }
  };

  const handleApply = async (job) => {
    try {
      await applicationAPI.apply({ jobId: job.id });
      setAppliedIds(prev => new Set([...prev, job.id]));
      toast.success(`Applied to ${job.title}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Application failed');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">Job Opportunities</h1>
          <p className="text-gray-500 text-sm mt-1">Aggregated from Wuzzuf, LinkedIn, Indeed & more</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'matches', label: '⚡ AI Matches', count: matches.length },
          { id: 'all',     label: '🔍 All Jobs',   count: pagination.total },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label} {t.count > 0 && <span className="ml-1 text-xs text-gray-400">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Search (all jobs tab) */}
      {tab === 'all' && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadAllJobs()}
              className="input pl-10 text-sm"
              placeholder="Search by title, company, skill…"
            />
          </div>
          <button onClick={() => loadAllJobs()} className="btn-primary text-sm px-5 flex items-center gap-2">
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {tab === 'matches' ? 'AI is finding your best matches…' : 'Loading jobs…'}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          {tab === 'matches' && (
            <div>
              {matches.length === 0 ? (
                <div className="card p-12 text-center">
                  <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-700 mb-2">No matches yet</h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto">Complete your CV upload and skills assessment to unlock AI job matching.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((job, i) => (
                    <div key={job.id}>
                      {i === 0 && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-3">
                          <Star className="w-4 h-4" /> Top Match
                        </div>
                      )}
                      <JobCard
                        job={job} isMatch appliedIds={appliedIds}
                        onApply={handleApply} onCoverLetter={setCoverJob}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'all' && (
            <div>
              <div className="space-y-3">
                {allJobs.map(job => (
                  <JobCard
                    key={job.id} job={job} isMatch={false} appliedIds={appliedIds}
                    onApply={handleApply} onCoverLetter={setCoverJob}
                  />
                ))}
                {allJobs.length === 0 && (
                  <div className="card p-12 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-700 mb-2">No jobs found</h3>
                    <button onClick={() => jobAPI.seed().then(() => loadAllJobs())} className="btn-primary text-sm mt-4">
                      Load Demo Jobs
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p} onClick={() => loadAllJobs(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold ${
                        p === pagination.page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >{p}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Cover letter modal */}
      {coverJob && <CoverLetterModal job={coverJob} onClose={() => setCoverJob(null)} />}
    </div>
  );
}
