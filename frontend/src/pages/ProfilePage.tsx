import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Briefcase, Building, Save, Camera, Trash2,
  CheckCircle, ArrowLeft, ShieldCheck, Clock, FileText, AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import useAuth from '@/hooks/useAuth';
import { ROUTES } from '@/constants';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state initialized from auth context
  const [name, setName] = useState(user?.name ?? 'Dhanush');
  const [email, setEmail] = useState(user?.email ?? 'dhanush@researchmind.ai');
  const [title, setTitle] = useState(user?.title ?? 'Research Analyst');
  const [bio, setBio] = useState(user?.bio ?? 'Passionate about deep research, battery technologies, and post-quantum cryptography.');
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  
  // UI states
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute initials for avatar fallback
  const userInitials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'RM';

  // Handle Avatar image file selection and conversion to Base64
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG).');
      return;
    }

    // Validate size (max 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatar(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    setAvatar(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }

    // Update the state in AuthContext (persists to localStorage)
    updateUser({
      name: name.trim(),
      email: email.trim(),
      title: title.trim(),
      bio: bio.trim(),
      avatar: avatar,
    });

    setError(null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <AppShell>
      <div className="max-w-[1000px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Back and Header Row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Profile Settings
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5 font-medium">
                Update your account details, photo, and public bio.
              </p>
            </div>
          </div>

          {isSaved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 bg-green-50 border border-green-150 text-[#16a34a] px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <CheckCircle className="h-4 w-4 text-[#16a34a]" />
              <span>Profile updated successfully!</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 bg-red-50 border border-red-150 text-red-650 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Avatar Card & Metadata */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-center relative overflow-hidden">
              {/* Background gradient blur decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-green-600" />
              
              <div className="flex flex-col items-center mt-3">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-neutral-50 shadow-md bg-neutral-100 flex items-center justify-center transition-all group-hover:opacity-90">
                    {avatar ? (
                      <img src={avatar} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-emerald-600 to-emerald-500 text-white text-3xl font-extrabold flex items-center justify-center">
                        {userInitials}
                      </div>
                    )}
                  </div>
                  
                  {/* Upload overlay button */}
                  <button
                    onClick={triggerFileInput}
                    className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-neutral-200 text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50 shadow-lg transition-all"
                    title="Change picture"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <h3 className="mt-4 font-bold text-base text-neutral-900">{name}</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">{title}</p>
                <p className="text-[11px] text-neutral-400 font-medium mt-1">{email}</p>

                {/* Avatar actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  >
                    Upload New
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="bg-white hover:bg-red-50 border border-neutral-200 text-red-650 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                      title="Remove Profile Image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status details */}
              <div className="mt-6 pt-5 border-t border-neutral-100 grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-405 uppercase tracking-wider block">Access Status</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verified</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-405 uppercase tracking-wider block">Workspace Role</span>
                  <span className="text-xs font-bold text-neutral-800">Administrator</span>
                </div>
              </div>
            </div>

            {/* Quick stats details card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">Account Metrics</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <span>Member Since</span>
                  </div>
                  <span className="font-bold text-neutral-800">May 2026</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                    <FileText className="h-4 w-4 text-neutral-400" />
                    <span>Reports Compiled</span>
                  </div>
                  <span className="font-bold text-neutral-850">14 Reports</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Edit Profile details Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSave} className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-6">
              
              <div className="border-b border-neutral-100 pb-3.5">
                <h2 className="font-bold text-sm text-neutral-900">Personal Information</h2>
                <p className="text-xs text-neutral-405 font-medium mt-0.5">Edit how your profile is displayed inside your workspace.</p>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-neutral-900 transition-all font-medium placeholder-neutral-350"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-neutral-900 transition-all font-medium placeholder-neutral-350"
                  />
                </div>

                {/* Job Title */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Job Title / Professional Role</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Battery Chemistry Researcher, Software Architect"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-neutral-900 transition-all font-medium placeholder-neutral-350"
                  />
                </div>

                {/* Professional Bio */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-700">Bio / About Yourself</label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Share a short bio summarizing your background, expertise, or research interests."
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-neutral-900 transition-all font-medium placeholder-neutral-350 resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/10 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </AppShell>
  );
};

export default ProfilePage;
