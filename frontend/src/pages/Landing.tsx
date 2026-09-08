import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  GraduationCap, Search, Trophy, Zap, ShoppingBag, Users, ArrowRight,
  Star, TrendingUp, DollarSign, BookOpen, Briefcase, Award, X
} from 'lucide-react';
import { api } from '@/lib/mockApi';
import type { College, Gig, MarketplaceItem } from '@/lib/types';
import heroBg from '@/assets/hero-bg.jpg';
import cvrCoin from '@/assets/cvr-coin.png';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShaderShowcase from '@/components/ui/hero';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-foreground">Contact a Verified Senior</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        {sent ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-success" />
            </div>
            <p className="text-foreground font-semibold">Inquiry Sent!</p>
            <p className="text-sm text-muted-foreground mt-1">A verified senior will reach out to you soon.</p>
          </div>
        ) : (
          <form onSubmit={async e => { e.preventDefault(); await api.submitContactInquiry(form); setSent(true); }} className="space-y-3">
            <input placeholder="Your Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="email" placeholder="Your Email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <textarea placeholder="Your question or message..." required rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            <button type="submit" className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Submit Inquiry</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<College[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [search, setSearch] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [collegeLeaderboard, setCollegeLeaderboard] = useState<any[]>([]);
  const [studentLeaderboard, setStudentLeaderboard] = useState<any[]>([]);
  const [lbCategory, setLbCategory] = useState('all');

  useEffect(() => {
    api.getColleges().then(d => setColleges(Array.isArray(d) ? d : [])).catch(() => {});
    api.getGigs().then(g => setGigs((Array.isArray(g) ? g : []).filter(x => x.status === 'open').slice(0, 3))).catch(() => {});
    api.getMarketplaceItems().then(m => setItems((Array.isArray(m) ? m : []).filter(x => x.status === 'available').slice(0, 4))).catch(() => {});
    api.getCollegeLeaderboard().then(d => setCollegeLeaderboard(Array.isArray(d) ? d : [])).catch(() => {});
    api.getStudentLeaderboard().then(d => setStudentLeaderboard(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const cat = lbCategory === 'all' ? undefined : lbCategory;
    api.getStudentLeaderboard(cat).then(d => setStudentLeaderboard(Array.isArray(d) ? d : [])).catch(() => {});
  }, [lbCategory]);

  const filtered = colleges.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.location || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/60" />
        </div>
        <div className="container-main relative z-10 py-20">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-2xl flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-primary/30 text-primary text-[11px] cyber-label mb-6 chamfer-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> SIGNAL ONLINE // COLLEGE ECOSYSTEM FEED
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-6 cyber-heading leading-[1.1]">
                <span className="text-foreground cyber-glitch" data-text="ONE PLATFORM.">ONE PLATFORM.</span><br />
                <span className="gradient-text italic">EVERY COLLEGE.</span><br />
                <span className="gradient-text italic">EVERY STUDENT.</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl border-l-2 border-primary/40 pl-4">
                CollegeVerse connects students, faculty, and recruiters in a unified ecosystem — with verified identities, MicroGigs, Marketplace, SBT wallets, and more.
                <span className="inline-block w-2 h-5 align-middle bg-primary ml-2 animate-pulse" />
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <button onClick={() => navigate('/colleges')} className="px-6 py-3 border-2 border-primary text-primary min-h-11 cyber-label text-xs hover:bg-primary hover:text-primary-foreground transition-all chamfer-sm glow-primary">
                  Get Started <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
                <button onClick={() => navigate('/leaderboard')} className="px-6 py-3 border-2 border-violet text-violet min-h-11 cyber-label text-xs hover:bg-violet hover:text-violet-foreground transition-all chamfer-sm">
                  View Leaderboards
                </button>
                <button onClick={() => navigate('/login')} className="px-6 py-3 border border-border text-foreground min-h-11 cyber-label text-xs hover:border-primary hover:text-primary hover:shadow-[var(--box-shadow-neon-sm)] transition-all chamfer-sm">
                  Login
                </button>
              </div>
              {/* Stats row */}
              <div className="cyber-terminal p-4 max-w-md">
                <p className="text-[10px] cyber-label text-primary mb-3">&gt; live-network-stats</p>
                <div className="flex gap-4 sm:gap-6">
                  <div><p className="text-2xl font-bold text-foreground cyber-heading">50+</p><p className="text-[10px] text-muted-foreground cyber-label">Colleges</p></div>
                  <div className="w-px bg-border" />
                  <div><p className="text-2xl font-bold text-primary cyber-heading">10K+</p><p className="text-[10px] text-muted-foreground cyber-label">Students</p></div>
                  <div className="w-px bg-border" />
                  <div><p className="text-2xl font-bold text-foreground cyber-heading">₹5L+</p><p className="text-[10px] text-muted-foreground cyber-label">Earned</p></div>
                </div>
              </div>
            </motion.div>

            {/* Shader Coin Showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex-shrink-0 relative"
            >
              <ShaderShowcase coinSrc={cvrCoin} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* College Search */}
      <section className="section-padding bg-secondary/20">
        <div className="container-main">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Find Your College</h2>
            <p className="text-muted-foreground mb-6">Search and explore top colleges across India</p>
            <div className="relative max-w-lg mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search colleges by name or location..." className="w-full pl-10 pr-4 py-3 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.slice(0, 6).map(c => (
                <div key={c.id} onClick={() => navigate(`/colleges/${c.id}`)} className="glass-card-hover p-5 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <p className="text-sm text-muted-foreground">{c.location}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">#{c.ranking}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{(c.description || '').slice(0, 80)}...</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{c.type} · {(c.studentCount || 0).toLocaleString()} students</span>
                    <button onClick={e => { e.stopPropagation(); setContactOpen(true); }} className="text-xs text-cyan hover:underline">Contact Senior</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="section-padding">
        <div className="container-main">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Leaderboards</h2>
                <p className="text-muted-foreground">Top colleges and students ranked by performance</p>
              </div>
              <button onClick={() => navigate('/leaderboard')} className="text-sm text-primary hover:underline font-medium">View All →</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* College */}
              <div className="glass-card p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> College Rankings</h3>
                <div className="space-y-2">
                  {collegeLeaderboard.slice(0, 5).map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${i === 0 ? 'text-warning' : i === 1 ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>#{i + 1}</span>
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                      </div>
                      <span className="text-sm text-primary font-mono">{c.totalPoints} pts</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Student */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Star className="h-4 w-4 text-cyan" /> Student Rankings</h3>
                  <div className="flex gap-1">
                    {['all', 'cultural', 'sports', 'education'].map(cat => (
                      <button key={cat} onClick={() => setLbCategory(cat)} className={`text-xs px-2 py-1 rounded-md transition-colors ${lbCategory === cat ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {studentLeaderboard.slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>#{i + 1}</span>
                        <div>
                          <span className="text-sm font-medium text-foreground">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.collegeName}</span>
                        </div>
                      </div>
                      <span className="text-sm text-cyan font-mono">{s.totalPoints} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MicroGigs Preview */}
      <section className="section-padding bg-secondary/20">
        <div className="container-main">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 flex items-center gap-2"><Zap className="h-6 w-6 text-warning" /> MicroGigs</h2>
                <p className="text-muted-foreground">Short-term tasks, real rewards — earn while you learn</p>
              </div>
              <button onClick={() => navigate('/microgigs')} className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">Browse All Gigs →</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gigs.map(g => (
                <div key={g.id} className="glass-card-hover p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-foreground text-sm">{g.title}</h3>
                    {g.paid && <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">₹{g.reward}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{g.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(g.skills || []).slice(0, 3).map(s => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>)}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{g.mode} · {g.duration}</span>
                    <span>{g.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Marketplace Preview */}
      <section className="section-padding">
        <div className="container-main">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-violet" /> Marketplace</h2>
                <p className="text-muted-foreground">Buy and sell within your verified campus community</p>
              </div>
              <button onClick={() => navigate('/marketplace')} className="px-4 py-2 rounded-lg bg-violet/10 text-violet text-sm font-medium hover:bg-violet/20 transition-colors">Browse Marketplace →</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id} className="glass-card-hover p-4">
                  <div className="w-full aspect-square rounded-lg bg-secondary/50 flex items-center justify-center mb-3">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="font-medium text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-lg font-bold text-primary mb-1">₹{item.price}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.condition}</span>
                    <span>{item.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Economic Ecosystem */}
      <section className="section-padding bg-secondary/20">
        <div className="container-main">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-center">The CollegeVerse Economy</h2>
            <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">A self-sustaining ecosystem where everyone earns, learns, and grows</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { title: 'Students Earn', icon: <TrendingUp className="h-5 w-5" />, color: 'text-cyan', items: ['MicroGigs completion', 'Marketplace sales', 'Tutoring & mentorship', 'Competition prizes'] },
                { title: 'Faculty Earn', icon: <BookOpen className="h-5 w-5" />, color: 'text-violet', items: ['Workshop hosting', 'Mentorship programs', 'Curriculum consulting', 'Research grants'] },
                { title: 'Colleges Earn', icon: <GraduationCap className="h-5 w-5" />, color: 'text-primary', items: ['Marketplace revenue share', 'Faculty workshop share', 'Sponsored events', 'Premium features'] },
                { title: 'Recruiters Pay', icon: <Briefcase className="h-5 w-5" />, color: 'text-warning', items: ['Verified talent access', 'MicroGig posting', 'Assessment tools', 'Priority placements'] },
              ].map(item => (
                <div key={item.title} className="glass-card p-5">
                  <div className={`${item.color} mb-3`}>{item.icon}</div>
                  <h3 className="font-semibold text-foreground mb-3">{item.title}</h3>
                  <ul className="space-y-2">
                    {item.items.map(i => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-success flex-shrink-0" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-main text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">Ready to Join CollegeVerse?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Sign up with your college email to unlock the full student experience — verified identity, SBT wallet, and more.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => navigate('/login')} className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all glow-primary">
                Get Started <ArrowRight className="inline h-4 w-4 ml-1" />
              </button>
              <button onClick={() => navigate('/about')} className="px-8 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors border border-border">
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
