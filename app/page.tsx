'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Bookmark, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  Bell, 
  ExternalLink, 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign,
  ChevronRight,
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  FileText,
  Download,
  Plus,
  Trash2,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { cn, Job, JobStatus, JobMode, UserPreferences, SavedJob, MOCK_JOBS } from '@/src/types';

// --- AI Assistant Logic ---

// Safely initialize AI to avoid crashes if API key is missing
const getAIClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

async function getKoddyResponse(message: string, context: { jobs: Job[], preferences: UserPreferences }) {
  try {
    const ai = getAIClient();
    if (!ai) return "AI features are currently unavailable. Please check your API key configuration.";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are Koddy, a helpful AI career assistant for a Job Tracker app. 
      Current Jobs in Feed: ${JSON.stringify(context.jobs.map(j => ({ title: j.title, company: j.company, location: j.location })))}
      User Preferences: ${JSON.stringify(context.preferences)}
      
      User Message: ${message}
      
      Keep your responses concise, professional, and encouraging. Help the user find the best jobs or give career advice based on their preferences.`,
    });
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Koddy Error:", error);
    return "I'm having a little trouble connecting right now. Please try again later!";
  }
}

async function getATSResumeTips(resumeData: any) {
  try {
    const ai = getAIClient();
    if (!ai) return "AI features are currently unavailable.";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an ATS (Applicant Tracking System) expert. Analyze the following resume data and provide 3-5 concise, high-impact tips to make it more ATS-friendly. Focus on keywords, formatting, and clarity.
      
      Resume Data: ${JSON.stringify(resumeData)}
      
      Return tips as a bulleted list.`,
    });
    return response.text || "No specific tips at this time.";
  } catch (error) {
    return "Could not generate tips at this time.";
  }
}

// --- Components ---

const FloatingBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <motion.div 
      animate={{ 
        x: [0, 100, 0], 
        y: [0, 50, 0],
        rotate: [0, 10, 0]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -top-24 -left-24 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl"
    />
    <motion.div 
      animate={{ 
        x: [0, -100, 0], 
        y: [0, -50, 0],
        rotate: [0, -10, 0]
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-3xl"
    />
  </div>
);

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border", className)}>
    {children}
  </span>
);

const IconButton = ({ icon: Icon, onClick, className, active }: { icon: any, onClick?: () => void, className?: string, active?: boolean }) => (
  <button 
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg transition-all duration-200 hover:bg-black/5 active:scale-95",
      active && "bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20",
      className
    )}
  >
    <Icon size={18} />
  </button>
);

const Button = ({ children, onClick, variant = 'primary', className, icon: Icon }: { children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'outline', className?: string, icon?: any }) => {
  const variants = {
    primary: "bg-brand-text text-white hover:bg-brand-text/90",
    secondary: "bg-brand-accent text-white hover:bg-brand-accent/90",
    outline: "bg-transparent border border-brand-border hover:bg-black/5 text-brand-text"
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98]",
        variants[variant],
        className
      )}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

// --- Main Page Component ---

export default function Page() {
  const [authStatus, setAuthStatus] = useState<'login' | 'register' | 'authenticated'>('login');
  const [user, setUser] = useState<{ email: string; isGuest: boolean } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'saved' | 'settings' | 'resume'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<JobMode | 'All'>('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedExp, setSelectedExp] = useState('All');
  const [sortBy, setSortBy] = useState<'latest' | 'score'>('latest');
  
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    keywords: ['React', 'Frontend', 'Design'],
    location: 'Remote',
    mode: 'Remote',
    minExperience: 3
  });

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDigest, setShowDigest] = useState(false);
  const [showKoddy, setShowKoddy] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'koddy', text: string }[]>([
    { role: 'koddy', text: "Hi! I'm Koddy. How can I help you with your job search today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Handle hydration and localStorage
  useEffect(() => {
    setIsMounted(true);
    const storedAuth = localStorage.getItem('auth_status');
    const storedUser = localStorage.getItem('user_data');
    const storedJobs = localStorage.getItem('saved_jobs');
    const storedPrefs = localStorage.getItem('user_preferences');

    if (storedAuth) setAuthStatus(storedAuth as any);
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedJobs) setSavedJobs(JSON.parse(storedJobs));
    if (storedPrefs) setPreferences(JSON.parse(storedPrefs));
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('saved_jobs', JSON.stringify(savedJobs));
  }, [savedJobs, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
  }, [preferences, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('auth_status', authStatus);
    if (user) {
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_data');
    }
  }, [authStatus, user, isMounted]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newUserMsg = { role: 'user' as const, text };
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    const response = await getKoddyResponse(text, { jobs: MOCK_JOBS, preferences });
    
    setChatMessages(prev => [...prev, { role: 'koddy' as const, text: response }]);
    setIsTyping(false);
  };

  const handleLogin = (email: string) => {
    setUser({ email, isGuest: false });
    setAuthStatus('authenticated');
  };

  const handleGuestLogin = () => {
    setUser({ email: 'guest@example.com', isGuest: true });
    setAuthStatus('authenticated');
  };

  const handleLogout = () => {
    setUser(null);
    setAuthStatus('login');
    localStorage.removeItem('auth_status');
    localStorage.removeItem('user_data');
  };

  const calculateMatchScore = (job: Job) => {
    let score = 0;
    const prefKeywords = preferences.keywords.map(k => k.toLowerCase());
    const jobText = (job.title + ' ' + job.description + ' ' + job.tags.join(' ')).toLowerCase();
    
    prefKeywords.forEach(keyword => {
      if (jobText.includes(keyword)) score += 20;
    });

    if (preferences.mode === 'All' || job.mode === preferences.mode) score += 20;
    if (job.location.toLowerCase().includes(preferences.location.toLowerCase())) score += 20;

    return Math.min(score, 100);
  };

  const filteredJobs = useMemo(() => {
    let jobs = [...MOCK_JOBS];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(j => 
        j.title.toLowerCase().includes(q) || 
        j.company.toLowerCase().includes(q) ||
        j.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (selectedMode !== 'All') jobs = jobs.filter(j => j.mode === selectedMode);
    if (selectedLocation !== 'All') jobs = jobs.filter(j => j.location.includes(selectedLocation));
    if (selectedExp !== 'All') jobs = jobs.filter(j => j.experience.includes(selectedExp));

    if (sortBy === 'latest') {
      jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } else {
      jobs.sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));
    }

    return jobs;
  }, [searchQuery, selectedMode, selectedLocation, selectedExp, sortBy, preferences]);

  const locations = useMemo(() => ['All', ...new Set(MOCK_JOBS.map(j => j.location.split(',')[0]))], []);
  const experiences = useMemo(() => ['All', '2+', '3+', '4+', '5+'], []);

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const exists = prev.find(sj => sj.jobId === jobId);
      if (exists) return prev.filter(sj => sj.jobId !== jobId);
      return [...prev, { jobId, status: 'Not Applied', savedAt: new Date().toISOString() }];
    });
  };

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    setSavedJobs(prev => prev.map(sj => sj.jobId === jobId ? { ...sj, status } : sj));
  };

  const getJobStatus = (jobId: string): JobStatus | null => {
    return savedJobs.find(sj => sj.jobId === jobId)?.status || null;
  };

  const isJobSaved = (jobId: string) => savedJobs.some(sj => sj.jobId === jobId);

  if (!isMounted) return null;

  if (authStatus === 'login' || authStatus === 'register') {
    return (
      <AuthPage 
        mode={authStatus} 
        onSwitch={() => setAuthStatus(authStatus === 'login' ? 'register' : 'login')}
        onLogin={handleLogin}
        onGuest={handleGuestLogin}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      <FloatingBackground />
      <aside className="w-full md:w-64 border-r border-brand-border bg-white p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center text-white font-bold">J</div>
          <h1 className="font-bold text-lg tracking-tight">JobTracker</h1>
        </div>

        <nav className="flex flex-col gap-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Bookmark} label="Saved Jobs" active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} count={savedJobs.length} />
          <NavItem icon={FileText} label="Resume Builder" active={activeTab === 'resume'} onClick={() => setActiveTab('resume')} />
          <NavItem icon={SettingsIcon} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="mt-auto space-y-4">
          <div className="p-4 bg-brand-bg rounded-xl border border-brand-border">
            <p className="text-xs font-medium text-brand-text/60 mb-2">DAILY DIGEST</p>
            <p className="text-sm font-semibold mb-3">Get your top matches for today.</p>
            <Button variant="secondary" className="w-full text-xs py-2" icon={Mail} onClick={() => setShowDigest(true)}>
              Generate Digest
            </Button>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all">
            <X size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-brand-border bg-white/50 backdrop-blur-sm px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40" size={16} />
              <input 
                type="text" 
                placeholder="Search jobs, companies, skills..." 
                className="w-full pl-10 pr-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent/40 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-xs font-bold leading-none">{user?.isGuest ? 'Guest User' : user?.email.split('@')[0]}</p>
              <p className="text-[10px] text-brand-text/40 font-medium">{user?.email}</p>
            </div>
            <IconButton icon={Bell} className="text-brand-text/60" />
            <div className="w-8 h-8 rounded-full bg-brand-border overflow-hidden border border-brand-border">
              <img src={`https://picsum.photos/seed/${user?.email}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Job Feed</h2>
                    <p className="text-brand-text/60 text-sm">Discover and track your next career move.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-white border border-brand-border rounded-lg p-1">
                      <FilterButton label="All" active={selectedMode === 'All'} onClick={() => setSelectedMode('All')} />
                      <FilterButton label="Remote" active={selectedMode === 'Remote'} onClick={() => setSelectedMode('Remote')} />
                      <FilterButton label="Hybrid" active={selectedMode === 'Hybrid'} onClick={() => setSelectedMode('Hybrid')} />
                    </div>
                    <select className="bg-white border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                      <option disabled>Location</option>
                      {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    <select className="bg-white border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none" value={selectedExp} onChange={(e) => setSelectedExp(e.target.value)}>
                      <option disabled>Experience</option>
                      {experiences.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                    </select>
                    <select className="bg-white border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                      <option value="latest">Latest</option>
                      <option value="score">Best Match</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredJobs.map((job) => (
                    <JobCard key={job.id} job={job} score={calculateMatchScore(job)} isSaved={isJobSaved(job.id)} status={getJobStatus(job.id)} onSave={() => toggleSaveJob(job.id)} onView={() => setSelectedJob(job)} />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Saved Jobs</h2>
                  <p className="text-brand-text/60 text-sm">Track the progress of your applications.</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {savedJobs.length > 0 ? (
                    savedJobs.map((sj) => {
                      const job = MOCK_JOBS.find(j => j.id === sj.jobId);
                      if (!job) return null;
                      return <SavedJobRow key={job.id} job={job} status={sj.status} onUpdateStatus={(status) => updateJobStatus(job.id, status)} onRemove={() => toggleSaveJob(job.id)} onView={() => setSelectedJob(job)} />;
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-brand-border border-dashed">
                      <Bookmark size={32} className="text-brand-text/20 mb-4" />
                      <h3 className="text-lg font-bold">No saved jobs yet</h3>
                      <p className="text-brand-text/60 max-w-xs mb-6">Jobs you save from the dashboard will appear here for tracking.</p>
                      <Button variant="outline" onClick={() => setActiveTab('dashboard')}>Browse Jobs</Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Preferences</h2>
                  <p className="text-brand-text/60 text-sm">Customize your job matching criteria.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-brand-border space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Keywords</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-brand-bg rounded-lg border border-brand-border">
                      {preferences.keywords.map((k, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-1 bg-white border border-brand-border rounded text-xs font-medium">
                          {k}
                          <button onClick={() => setPreferences(p => ({ ...p, keywords: p.keywords.filter((_, idx) => idx !== i) }))} className="hover:text-brand-accent"><X size={12} /></button>
                        </span>
                      ))}
                      <input 
                        type="text" placeholder="Add keyword..." className="bg-transparent text-xs focus:outline-none min-w-[100px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (val && !preferences.keywords.includes(val)) {
                              setPreferences(p => ({ ...p, keywords: [...p.keywords, val] }));
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Preferred Location</label>
                      <input type="text" value={preferences.location} onChange={(e) => setPreferences(p => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Work Mode</label>
                      <select value={preferences.mode} onChange={(e) => setPreferences(p => ({ ...p, mode: e.target.value as any }))} className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm focus:outline-none">
                        <option value="All">All Modes</option>
                        <option value="Remote">Remote Only</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Minimum Experience (Years)</label>
                    <input type="range" min="0" max="15" value={preferences.minExperience} onChange={(e) => setPreferences(p => ({ ...p, minExperience: parseInt(e.target.value) }))} className="w-full accent-brand-accent" />
                    <div className="flex justify-between text-xs text-brand-text/60">
                      <span>0 years</span>
                      <span className="font-bold text-brand-text">{preferences.minExperience} years</span>
                      <span>15+ years</span>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button variant="primary" onClick={() => setActiveTab('dashboard')}>Save & Apply</Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'resume' && (
              <motion.div key="resume" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">ATS Resume Builder</h2>
                  <p className="text-brand-text/60 text-sm">Create a resume optimized for applicant tracking systems.</p>
                </div>
                <ResumeBuilder />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} isSaved={isJobSaved(selectedJob.id)} onSave={() => toggleSaveJob(selectedJob.id)} />}
        {showDigest && <DigestModal jobs={MOCK_JOBS.sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a)).slice(0, 3)} onClose={() => setShowDigest(false)} />}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        <AnimatePresence>
          {showKoddy && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-brand-border flex flex-col overflow-hidden mb-2">
              <div className="p-4 bg-brand-text text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-accent" />
                  <div><h3 className="font-bold text-sm">Koddy AI</h3><p className="text-[10px] text-white/60">Career Assistant</p></div>
                </div>
                <button onClick={() => setShowKoddy(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-bg">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn("px-4 py-2 rounded-2xl text-sm", msg.role === 'user' ? "bg-brand-accent text-white rounded-tr-none" : "bg-white border border-brand-border text-brand-text rounded-tl-none")}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && <div className="flex items-center gap-2 text-brand-text/40 text-xs font-medium"><Loader2 size={14} className="animate-spin" />Koddy is thinking...</div>}
              </div>
              <form className="p-4 bg-white border-t border-brand-border flex gap-2" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement; handleSendMessage(input.value); input.value = ''; }}>
                <input name="message" type="text" placeholder="Ask Koddy anything..." className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-sm focus:outline-none" />
                <button type="submit" className="p-2 bg-brand-text text-white rounded-xl hover:bg-brand-text/90"><Send size={18} /></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowKoddy(!showKoddy)} className={cn("w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300", showKoddy ? "bg-brand-text text-white rotate-90" : "bg-brand-accent text-white")}>
          {showKoddy ? <X size={24} /> : <MessageSquare size={24} />}
        </motion.button>
      </div>
    </div>
  );
}

// --- Sub-components ---

function ResumeBuilder() {
  const [resume, setResume] = useState({ name: '', email: '', summary: '', experience: [{ company: '', role: '', duration: '', desc: '' }], skills: [''] });
  const [tips, setTips] = useState<string | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);

  const addExp = () => setResume(r => ({ ...r, experience: [...r.experience, { company: '', role: '', duration: '', desc: '' }] }));
  const removeExp = (i: number) => setResume(r => ({ ...r, experience: r.experience.filter((_, idx) => idx !== i) }));
  const updateExp = (i: number, field: string, val: string) => setResume(r => ({ ...r, experience: r.experience.map((exp, idx) => idx === i ? { ...exp, [field]: val } : exp) }));
  const addSkill = () => setResume(r => ({ ...r, skills: [...r.skills, ''] }));
  const updateSkill = (i: number, val: string) => setResume(r => ({ ...r, skills: r.skills.map((s, idx) => idx === i ? val : s) }));

  const handleGetTips = async () => {
    setLoadingTips(true);
    const result = await getATSResumeTips(resume);
    setTips(result);
    setLoadingTips(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-brand-border space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Personal Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Full Name" className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-none" value={resume.name} onChange={e => setResume(r => ({ ...r, name: e.target.value }))} />
            <input placeholder="Email" className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-none" value={resume.email} onChange={e => setResume(r => ({ ...r, email: e.target.value }))} />
          </div>
          <textarea placeholder="Professional Summary" className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-none h-24" value={resume.summary} onChange={e => setResume(r => ({ ...r, summary: e.target.value }))} />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold text-lg">Experience</h3><button onClick={addExp} className="text-brand-accent hover:bg-brand-accent/5 p-1 rounded"><Plus size={20} /></button></div>
          {resume.experience.map((exp, i) => (
            <div key={i} className="p-4 bg-brand-bg rounded-2xl border border-brand-border space-y-3 relative">
              <button onClick={() => removeExp(i)} className="absolute top-2 right-2 text-brand-text/20 hover:text-red-500"><Trash2 size={16} /></button>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Company" className="w-full px-3 py-1.5 bg-white border border-brand-border rounded-lg text-xs" value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} />
                <input placeholder="Role" className="w-full px-3 py-1.5 bg-white border border-brand-border rounded-lg text-xs" value={exp.role} onChange={e => updateExp(i, 'role', e.target.value)} />
              </div>
              <input placeholder="Duration" className="w-full px-3 py-1.5 bg-white border border-brand-border rounded-lg text-xs" value={exp.duration} onChange={e => updateExp(i, 'duration', e.target.value)} />
              <textarea placeholder="Key Achievements" className="w-full px-3 py-1.5 bg-white border border-brand-border rounded-lg text-xs h-16" value={exp.desc} onChange={e => updateExp(i, 'desc', e.target.value)} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold text-lg">Skills</h3><button onClick={addSkill} className="text-brand-accent hover:bg-brand-accent/5 p-1 rounded"><Plus size={20} /></button></div>
          <div className="flex flex-wrap gap-2">{resume.skills.map((skill, i) => <input key={i} placeholder="Skill" className="w-32 px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs" value={skill} onChange={e => updateSkill(i, e.target.value)} />)}</div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-brand-text text-white p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><Sparkles size={20} className="text-brand-accent" />ATS Optimization</h3><Button variant="secondary" className="text-xs py-1.5" onClick={handleGetTips} icon={loadingTips ? Loader2 : Sparkles}>{loadingTips ? 'Analyzing...' : 'Get AI Tips'}</Button></div>
          <div className="min-h-[200px] bg-white/5 rounded-2xl p-6 border border-white/10">
            {tips ? <div className="prose prose-invert prose-sm"><div className="text-white/80 whitespace-pre-wrap">{tips}</div></div> : <div className="flex flex-col items-center justify-center h-full text-center opacity-40"><AlertCircle size={32} className="mb-2" /><p className="text-sm">Fill out your resume and click "Get AI Tips" to optimize for ATS.</p></div>}
          </div>
          <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" icon={Download}>Download ATS-Friendly PDF</Button>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand-border">
          <h4 className="font-bold text-sm mb-4">Live Preview</h4>
          <div className="font-mono text-[10px] space-y-4 text-brand-text/60">
            <div><p className="font-bold text-brand-text uppercase">{resume.name || 'YOUR NAME'}</p><p>{resume.email || 'email@example.com'}</p></div>
            <div><p className="font-bold text-brand-text uppercase border-b border-brand-border mb-1">Summary</p><p>{resume.summary || 'Professional summary goes here...'}</p></div>
            <div><p className="font-bold text-brand-text uppercase border-b border-brand-border mb-1">Experience</p>{resume.experience.map((exp, i) => <div key={i} className="mb-2"><p className="font-bold text-brand-text">{exp.role} | {exp.company}</p><p className="italic">{exp.duration}</p><p className="whitespace-pre-wrap">{exp.desc}</p></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthPage({ mode, onSwitch, onLogin, onGuest }: { mode: 'login' | 'register', onSwitch: () => void, onLogin: (email: string) => void, onGuest: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (email && password) onLogin(email); };
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
      <FloatingBackground />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 100 }} className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-brand-border p-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand-accent rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-4">J</div>
          <h2 className="text-3xl font-bold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="text-brand-text/60 text-sm">Enter your details to access your dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-brand-text/40">Email Address</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-accent/40" /></div>
          <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-brand-text/40">Password</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-accent/40" /></div>
          <Button variant="primary" className="w-full py-3 text-base mt-2">{mode === 'login' ? 'Sign In' : 'Sign Up'}</Button>
        </form>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-border"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-brand-text/40 font-bold">Or continue with</span></div></div>
        <div className="grid grid-cols-1 gap-3"><Button variant="outline" className="w-full py-3" onClick={onGuest}>Continue as Guest</Button></div>
        <p className="text-center text-sm text-brand-text/60">{mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}<button onClick={onSwitch} className="font-bold text-brand-text hover:text-brand-accent underline underline-offset-4">{mode === 'login' ? 'Sign up' : 'Sign in'}</button></p>
      </motion.div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, count }: { icon: any, label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <button onClick={onClick} className={cn("flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group", active ? "bg-brand-text text-white" : "text-brand-text/60 hover:bg-black/5 hover:text-brand-text")}>
      <div className="flex items-center gap-3"><Icon size={18} className={cn(active ? "text-white" : "text-brand-text/40 group-hover:text-brand-text")} />{label}</div>
      {count !== undefined && count > 0 && <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", active ? "bg-white/20 text-white" : "bg-brand-bg text-brand-text/60")}>{count}</span>}
    </button>
  );
}

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return <button onClick={onClick} className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", active ? "bg-brand-text text-white shadow-sm" : "text-brand-text/60 hover:text-brand-text")}>{label}</button>;
}

function JobCard({ job, score, isSaved, status, onSave, onView }: { job: Job, score: number, isSaved: boolean, status: JobStatus | null, onSave: () => void, onView: () => void }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white border border-brand-border rounded-2xl p-6 card-hover flex flex-col gap-4 relative shadow-sm hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center font-bold text-brand-text/40 border border-brand-border">{job.company[0]}</div>
          <div><h3 className="font-bold text-lg leading-tight mb-1">{job.title}</h3><div className="flex items-center gap-2"><p className="text-sm font-medium text-brand-text/60">{job.company}</p><span className="w-1 h-1 bg-brand-border rounded-full" /><div className="flex items-center gap-1 text-[10px] font-bold text-brand-accent uppercase tracking-wider"><Globe size={10} />{job.source}</div></div></div>
        </div>
        <div className="flex flex-col items-end gap-2"><div className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", score > 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : score > 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-brand-bg text-brand-text/40 border-brand-border")}>{score}% MATCH</div><IconButton icon={Bookmark} active={isSaved} onClick={onSave} /></div>
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        <div className="flex items-center gap-2 text-xs text-brand-text/60"><MapPin size={14} />{job.location}</div>
        <div className="flex items-center gap-2 text-xs text-brand-text/60"><Briefcase size={14} />{job.mode}</div>
        <div className="flex items-center gap-2 text-xs text-brand-text/60"><Clock size={14} />{formatDistanceToNow(new Date(job.postedAt))} ago</div>
        <div className="flex items-center gap-2 text-xs text-brand-text/60 font-semibold"><DollarSign size={14} />{job.salary}</div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">{job.tags.slice(0, 3).map(tag => <Badge key={tag} className="bg-brand-bg border-brand-border text-brand-text/60">{tag}</Badge>)}</div>
      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-brand-border"><Button variant="outline" className="flex-1 py-2" onClick={onView}>View Details</Button><a href={job.link} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="primary" className="w-full py-2" icon={ExternalLink}>Apply</Button></a></div>
      {status && status !== 'Not Applied' && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2"><Badge className={cn("bg-white shadow-sm px-3 py-1", status === 'Applied' ? "text-blue-600 border-blue-200" : status === 'Rejected' ? "text-red-600 border-red-200" : "text-emerald-600 border-emerald-200")}>{status}</Badge></div>}
    </motion.div>
  );
}

function SavedJobRow({ job, status, onUpdateStatus, onRemove, onView }: { job: Job, status: JobStatus, onUpdateStatus: (s: JobStatus) => void, onRemove: () => void, onView: () => void }) {
  const statuses: JobStatus[] = ['Not Applied', 'Applied', 'Rejected', 'Selected'];
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-brand-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group shadow-sm hover:shadow-md">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center font-bold text-brand-text/40 border border-brand-border">{job.company[0]}</div>
        <div><h4 className="font-bold text-base group-hover:text-brand-accent transition-colors cursor-pointer" onClick={onView}>{job.title}</h4><p className="text-xs text-brand-text/60 font-medium">{job.company} • {job.location}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 bg-brand-bg p-1 rounded-lg border border-brand-border">{statuses.map(s => <button key={s} onClick={() => onUpdateStatus(s)} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-md transition-all", status === s ? "bg-white text-brand-text shadow-sm border border-brand-border" : "text-brand-text/40 hover:text-brand-text")}>{s}</button>)}</div>
        <div className="flex items-center gap-2 border-l border-brand-border pl-4"><IconButton icon={ExternalLink} onClick={() => window.open(job.link, '_blank')} /><IconButton icon={X} onClick={onRemove} className="text-red-500 hover:bg-red-50" /></div>
      </div>
    </motion.div>
  );
}

function JobDetailModal({ job, onClose, isSaved, onSave }: { job: Job, onClose: () => void, isSaved: boolean, onSave: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="relative h-32 bg-brand-bg border-b border-brand-border overflow-hidden"><div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#8B0000 1px, transparent 1px)', backgroundSize: '20px 20px' }} /><button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full border border-brand-border hover:bg-white transition-all"><X size={20} /></button></div>
        <div className="px-8 pb-8 -mt-10 flex-1 overflow-y-auto">
          <div className="flex justify-between items-end mb-8"><div className="flex gap-6 items-end"><div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center font-bold text-2xl text-brand-text/20">{job.company[0]}</div><div className="pb-2"><h2 className="text-2xl font-bold tracking-tight">{job.title}</h2><p className="text-brand-text/60 font-semibold">{job.company}</p></div></div><div className="flex gap-2 pb-2"><IconButton icon={Bookmark} active={isSaved} onClick={onSave} className="border border-brand-border" /><a href={job.link} target="_blank" rel="noopener noreferrer"><Button variant="primary" icon={ExternalLink}>Apply Now</Button></a></div></div>
          <div className="grid grid-cols-4 gap-4 mb-8"><div className="bg-brand-bg p-4 rounded-2xl border border-brand-border"><p className="text-[10px] font-bold text-brand-text/40 uppercase mb-1">Location</p><p className="text-sm font-bold">{job.location}</p></div><div className="bg-brand-bg p-4 rounded-2xl border border-brand-border"><p className="text-[10px] font-bold text-brand-text/40 uppercase mb-1">Mode</p><p className="text-sm font-bold">{job.mode}</p></div><div className="bg-brand-bg p-4 rounded-2xl border border-brand-border"><p className="text-[10px] font-bold text-brand-text/40 uppercase mb-1">Experience</p><p className="text-sm font-bold">{job.experience}</p></div><div className="bg-brand-bg p-4 rounded-2xl border border-brand-border"><p className="text-[10px] font-bold text-brand-text/40 uppercase mb-1">Salary</p><p className="text-sm font-bold">{job.salary}</p></div></div>
          <div className="space-y-6"><div><h4 className="text-sm font-bold uppercase tracking-wider text-brand-text/40 mb-3">About the role</h4><p className="text-brand-text/80 leading-relaxed">{job.description}</p></div><div><h4 className="text-sm font-bold uppercase tracking-wider text-brand-text/40 mb-3">Requirements & Tags</h4><div className="flex flex-wrap gap-2">{job.tags.map(tag => <Badge key={tag} className="bg-white border-brand-border text-brand-text/60 px-3 py-1">{tag}</Badge>)}</div></div></div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DigestModal({ jobs, onClose }: { jobs: Job[], onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-8 bg-brand-text text-white"><div className="flex justify-between items-start mb-6"><div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center text-white font-bold">J</div><button onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button></div><h2 className="text-3xl font-bold tracking-tight mb-2">Your Daily Digest</h2><p className="text-white/60 text-sm">We found {jobs.length} matches for you today.</p></div>
        <div className="p-8 space-y-6 bg-brand-bg">{jobs.map((job, i) => <div key={job.id} className="bg-white p-6 rounded-2xl border border-brand-border shadow-sm flex items-center justify-between gap-4"><div className="flex items-center gap-4"><span className="text-2xl font-bold text-brand-text/10">{i + 1}</span><div><h4 className="font-bold text-base">{job.title}</h4><p className="text-xs text-brand-text/60 font-medium">{job.company} • {job.salary}</p></div></div><a href={job.link} target="_blank" rel="noopener noreferrer"><IconButton icon={ChevronRight} className="bg-brand-bg" /></a></div>)}<div className="pt-4 text-center"><Button variant="primary" className="w-full" onClick={onClose}>View All Jobs</Button></div></div>
      </motion.div>
    </motion.div>
  );
}
