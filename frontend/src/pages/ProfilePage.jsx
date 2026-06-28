import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { User, MapPin, Briefcase, Link2, Globe, Save, CheckCircle2, Shield, Loader2 } from 'lucide-react';
import { profileAPI } from '../services/api.js';
import { useAuthStore } from '../store/auth.store.js';

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    profileAPI.get().then(r => {
      setProfile(r.data);
      reset({
        firstName:       user?.firstName || '',
        lastName:        user?.lastName  || '',
        phone:           user?.phone     || '',
        jobTitle:        r.data?.jobTitle || '',
        location:        r.data?.location || '',
        bio:             r.data?.bio || '',
        linkedinUrl:     r.data?.linkedinUrl || '',
        portfolioUrl:    r.data?.portfolioUrl || '',
        yearsExperience: r.data?.yearsExperience || '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await profileAPI.update(data);
      await refreshUser();
      toast.success('Profile updated!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6 animate-slide-up max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Keep your profile up to date for better job matches</p>
      </div>

      {/* Avatar + verified skills */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg text-gray-900">{user?.firstName} {user?.lastName}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
          {profile?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Shield className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              {profile.skills.slice(0, 8).map(s => (
                <span key={s} className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-0.5 font-medium">
                  ✓ {s}
                </span>
              ))}
            </div>
          )}
        </div>
        {profile?.skills?.length > 0 && (
          <div className="flex-shrink-0 text-center">
            <div className="font-display font-bold text-2xl text-green-600">{profile.skills.length}</div>
            <div className="text-xs text-gray-400">Verified Skills</div>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        {/* Personal */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input {...register('firstName', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input {...register('lastName', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} type="tel" className="input" placeholder="+20 10 0000 0000" />
            </div>
            <div>
              <label className="label">Years of Experience</label>
              <input {...register('yearsExperience')} type="number" min="0" max="50" className="input" placeholder="3" />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Professional */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Professional Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Job Title</label>
              <input {...register('jobTitle')} className="input" placeholder="e.g. Senior Frontend Developer" />
            </div>
            <div>
              <label className="label">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('location')} className="input pl-10" placeholder="Cairo, Egypt" />
              </div>
            </div>
            <div>
              <label className="label">Bio / Summary</label>
              <textarea {...register('bio')} rows={4} className="input resize-none"
                placeholder="A brief professional summary about yourself…" />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Links */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Links
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">LinkedIn URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('linkedinUrl')} type="url" className="input pl-10" placeholder="https://linkedin.com/in/yourname" />
              </div>
            </div>
            <div>
              <label className="label">Portfolio / GitHub</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('portfolioUrl')} type="url" className="input pl-10" placeholder="https://github.com/yourname" />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving || !isDirty} className="btn-primary flex items-center gap-2 w-full justify-center">
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Verified skills (read-only) */}
      {profile?.skills?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" /> Verified Skills (from assessment)
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(s => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> {s}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">These skills were verified through your proctored assessment and will be shown to employers.</p>
        </div>
      )}
    </div>
  );
}
