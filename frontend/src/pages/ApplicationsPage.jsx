import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ClipboardList, MapPin, ExternalLink, ChevronDown,
  Loader2, Trash2, TrendingUp, Clock, CheckCircle2,
  XCircle, Eye, MessageSquare, Award
} from 'lucide-react';
import { applicationAPI } from '../services/api.js';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  APPLIED:   { label: 'Applied',    icon: Clock,         color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
  VIEWED:    { label: 'Viewed',     icon: Eye,           color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  INTERVIEW: { label: 'Interview',  icon: MessageSquare, color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  OFFER:     { label: 'Offer! 🎉', icon: Award,         color: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  REJECTED:  { label: 'Rejected',   icon: XCircle,       color: 'bg-red-100 text-red-700',       dot: 'bg-red-400'    },
  ACCEPTED:  { label: 'Accepted',   icon: CheckCircle2,  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="font-display font-bold text-2xl text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

const ApplicationCard = ({ app, onStatusChange, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const cfg = statusConfig[app.status] || statusConfig.APPLIED;
  const StatusIcon = cfg.icon;

  const handleStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await onStatusChange(app.id, newStatus);
      toast.success('Status updated');
    } catch { toast.error('Failed to update'); }
    finally { setUpdating(false); setOpen(false); }
  };

  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Company initial */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
          {app.job?.company?.[0]?.toUpperCase() || 'J'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 leading-tight truncate">{app.job?.title}</h3>
              <p className="text-xs text-blue-600 font-medium mt-0.5">{app.job?.company}</p>
            </div>

            {/* Status badge + dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setOpen(o => !o)}
                disabled={updating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.color}`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>
              {open && (
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-40">
                  {Object.entries(statusConfig).map(([s, c]) => (
                    <button
                      key={s}
                      onClick={() => handleStatus(s)}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            {app.job?.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.job.location}</span>
            )}
            {app.job?.type && <span>{app.job.type}</span>}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
            </span>
            {app.responseAt && (
              <span className="text-green-600 font-medium">
                Responded {formatDistanceToNow(new Date(app.responseAt), { addSuffix: true })}
              </span>
            )}
          </div>

          {app.notes && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2 italic">
              "{app.notes}"
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {app.job?.sourceUrl && (
              <a href={app.job.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                <ExternalLink className="w-3 h-3" /> View Job
              </a>
            )}
            <button
              onClick={() => onDelete(app.id)}
              className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KanbanCol = ({ status, apps, onStatusChange, onDelete }) => {
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;
  return (
    <div className="min-w-[240px] flex-1">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{apps.length}</span>
      </div>
      <div className="space-y-2">
        {apps.map(app => (
          <ApplicationCard key={app.id} app={app} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))}
        {apps.length === 0 && (
          <div className="border-2 border-dashed border-gray-100 rounded-xl p-6 text-center">
            <p className="text-xs text-gray-300">No applications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats]               = useState({});
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState('list'); // list | kanban

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data } = await applicationAPI.list();
      setApplications(data.applications || []);
      setStats(data.stats || {});
    } catch { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    await applicationAPI.updateStatus(id, { status });
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this application?')) return;
    try {
      await applicationAPI.delete(id);
      setApplications(prev => prev.filter(a => a.id !== id));
      toast.success('Application removed');
    } catch { toast.error('Failed to delete'); }
  };

  const statItems = [
    { label: 'Total Applied',  value: stats.total     || 0, icon: ClipboardList,    color: 'bg-blue-100 text-blue-600'    },
    { label: 'Under Review',   value: stats.viewed    || 0, icon: Eye,              color: 'bg-purple-100 text-purple-600' },
    { label: 'Interviews',     value: stats.interview || 0, icon: MessageSquare,    color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Offers',         value: stats.offer     || 0, icon: Award,            color: 'bg-green-100 text-green-600'   },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  const grouped = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">Applications Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Track every job you've applied to</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['list', 'kanban'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Response rate */}
      {stats.total > 0 && (
        <div className="card p-5 flex items-center gap-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">Response Rate</span>
              <span className="font-bold text-blue-600">
                {Math.round(((stats.viewed || 0) + (stats.interview || 0) + (stats.offer || 0)) / stats.total * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                style={{ width: `${Math.round(((stats.viewed || 0) + (stats.interview || 0) + (stats.offer || 0)) / stats.total * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {applications.length === 0 && (
        <div className="card p-16 text-center">
          <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">No applications yet</h3>
          <p className="text-gray-400 text-sm mb-6">Apply to jobs from the Jobs page to start tracking here</p>
          <a href="/jobs" className="btn-primary text-sm inline-flex">Browse Job Matches</a>
        </div>
      )}

      {/* List view */}
      {applications.length > 0 && view === 'list' && (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard key={app.id} app={app} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Kanban view */}
      {applications.length > 0 && view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(statusConfig).map(([status]) => (
            <KanbanCol
              key={status} status={status}
              apps={grouped[status] || []}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
