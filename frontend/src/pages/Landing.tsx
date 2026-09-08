import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, ChevronDown, GraduationCap, ShoppingBag, Sparkles, Trophy, WalletCards, Check } from 'lucide-react';
import { api } from '@/lib/mockApi';
import type { Gig, MarketplaceItem } from '@/lib/types';
import almadoxCoin from '@/assets/almadox-coin-warm.png';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// Lovable's reveal animation
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" as any },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

const roles = [
  { icon: GraduationCap, title: "Students", copy: "Turn every project, skill and contribution into a trusted record that travels with you." },
  { icon: Building2, title: "Colleges", copy: "Issue credentials, activate campus commerce and see your community thrive in one place." },
  { icon: BriefcaseBusiness, title: "Recruiters", copy: "Find proven talent through verified education, skills and real work—not inflated profiles." },
];

const MOCK_GIGS = [
  { id: '1', title: 'Develop Smart Contract for Campus DAO', description: 'We need an experienced developer to write a basic voting smart contract in Solidity for our upcoming campus DAO.', reward: 1500, paid: true, mode: 'Remote', duration: '2 weeks', category: 'Engineering' },
  { id: '2', title: 'UI Designer for E-cell Website', description: 'Looking for a UI/UX designer to redesign the landing page for our entrepreneurship cell. Figma required.', reward: 800, paid: true, mode: 'Hybrid', duration: '1 week', category: 'Design' },
  { id: '3', title: 'Campus Ambassador (Techfest)', description: 'Represent our annual tech fest in your department. Help with marketing and registration.', reward: 500, paid: true, mode: 'On-campus', duration: '1 month', category: 'Marketing' },
] as any[];

const MOCK_COLLEGES = [
  { id: 'c1', name: 'Meridian Institute of Tech', totalPoints: 12450 },
  { id: 'c2', name: 'National College of Eng', totalPoints: 11200 },
  { id: 'c3', name: 'State University', totalPoints: 9800 },
];

const MOCK_STUDENTS = [
  { id: 's1', name: 'Amara Vance', totalPoints: 1420, collegeName: 'Meridian Institute' },
  { id: 's2', name: 'Rahul Sharma', totalPoints: 1350, collegeName: 'National College' },
  { id: 's3', name: 'Sarah Chen', totalPoints: 1280, collegeName: 'State University' },
];

export default function Landing() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [collegeLeaderboard, setCollegeLeaderboard] = useState<any[]>([]);
  const [studentLeaderboard, setStudentLeaderboard] = useState<any[]>([]);
  const [lbCategory, setLbCategory] = useState('all');

  useEffect(() => {
    api.getGigs().then((g) => {
      const arr = Array.isArray(g) ? g.filter((x) => x.status === 'open') : [];
      setGigs(arr.length > 0 ? arr.slice(0, 3) : MOCK_GIGS);
    }).catch(() => setGigs(MOCK_GIGS));
    
    api.getMarketplaceItems().then((m) => setItems((Array.isArray(m) ? m : []).filter((x) => x.status === 'available').slice(0, 4))).catch(() => {});
    
    api.getCollegeLeaderboard().then((d) => {
      const arr = Array.isArray(d) ? d : [];
      setCollegeLeaderboard(arr.length > 0 ? arr : MOCK_COLLEGES);
    }).catch(() => setCollegeLeaderboard(MOCK_COLLEGES));

    api.getStudentLeaderboard().then((d) => {
      const arr = Array.isArray(d) ? d : [];
      setStudentLeaderboard(arr.length > 0 ? arr : MOCK_STUDENTS);
    }).catch(() => setStudentLeaderboard(MOCK_STUDENTS));
  }, []);

  useEffect(() => {
    const cat = lbCategory === 'all' ? undefined : lbCategory;
    api.getStudentLeaderboard(cat).then((d) => {
      const arr = Array.isArray(d) ? d : [];
      setStudentLeaderboard(arr.length > 0 ? arr : MOCK_STUDENTS);
    }).catch(() => setStudentLeaderboard(MOCK_STUDENTS));
  }, [lbCategory]);

  return (
    <div className="min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <Navbar />

      <section className="golden-glow relative overflow-hidden pb-10 pt-16 border-b border-line">
        <div className="network-grid pointer-events-none absolute inset-0 opacity-35 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent)]" />
        
        <main id="top" className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-12 px-4 sm:px-6 lg:px-10 pb-8 pt-16 lg:grid-cols-12 lg:pt-20">
          <motion.div className="lg:col-span-7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary tracking-widest" style={{ background: 'color-mix(in oklab, var(--primary) 10%, transparent)', borderColor: 'color-mix(in oklab, var(--primary) 30%, transparent)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ boxShadow: '0 0 6px var(--primary)' }} /> Decentralized · verified · on-chain
            </span>
            <h1 className="mt-8 max-w-[12ch] text-5xl font-bold leading-[1.05] sm:text-6xl md:text-7xl" style={{ fontFamily: '"Fraunces", serif' }}>
              Where campuses meet <em className="text-primary not-italic drop-shadow-[0_0_15px_color-mix(in_oklab,var(--primary)_40%,transparent)]">trust.</em>
            </h1>
            <p className="mt-8 max-w-xl text-lg sm:text-xl leading-relaxed text-muted-foreground">Almadox gives students, faculty, colleges and recruiters one verified place to connect, work and grow. No bots. No fake profiles. Just real people and proven opportunity.</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button onClick={() => navigate('/login')} className="btn-primary">Start verifying <ArrowRight size={17} /></button>
              <button onClick={() => document.getElementById('network')?.scrollIntoView({ behavior: 'smooth' })} className="btn-ghost">Explore the network</button>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                <span className="grid size-10 place-items-center rounded-full bg-accent text-xs font-bold text-background ring-2 ring-background">MK</span>
                <span className="grid size-10 place-items-center rounded-full bg-primary text-xs font-bold text-background ring-2 ring-background">AR</span>
                <span className="grid size-10 place-items-center rounded-full bg-foreground text-xs font-bold text-background ring-2 ring-background">DL</span>
              </div>
              <p><strong className="text-foreground stat-num text-lg">50+</strong> colleges · <strong className="text-foreground stat-num text-lg">10K+</strong> students</p>
            </div>
          </motion.div>

          {/* Our Medallion Hero Graphic (Identity Frame) */}
          <motion.div className="lg:col-span-5 flex justify-center lg:justify-end mt-12 lg:mt-0" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
            <div className="w-full max-w-[480px] rounded-[40px] bg-card p-4 shadow-2xl border border-line relative z-20 md:-translate-x-4">
              {/* Top Graphic Area (The Coin) */}
              <div className="relative h-[400px] w-full rounded-[32px] bg-surface overflow-hidden flex items-center justify-center border border-line">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                
                <div className="coin-wrapper relative w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]">
                  <div className={prefersReduced ? 'coin w-full h-full' : 'coin w-full h-full animate-coin-rotate'}>
                    <img src={almadoxCoin} alt="Almadox verified identity coin" className="relative z-10 w-full h-full object-contain drop-shadow-2xl" />
                  </div>
                  
                  {/* Floating Orbit Nodes */}
                  <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-card border flex items-center justify-center text-xs font-bold animate-float z-0" style={{ animationDelay: '0s', fontFamily: '"Fraunces", serif', borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 16px color-mix(in oklab, var(--accent) 20%, transparent)' }}>SBT</div>
                  <div className="absolute -bottom-4 -left-8 w-16 h-16 rounded-full bg-card border flex items-center justify-center text-xs font-bold animate-float z-0" style={{ animationDelay: '1s', fontFamily: '"Fraunces", serif', borderColor: 'var(--primary)', color: 'var(--primary)', boxShadow: '0 0 16px color-mix(in oklab, var(--primary) 20%, transparent)' }}>ID</div>
                </div>

                {/* Network Verified Overlay */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-line shadow-sm">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Network verified</span>
                </div>
                <div className="absolute bottom-4 left-4 flex items-center px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-line shadow-sm">
                  <span className="text-xs font-bold text-foreground tracking-wide">Almadox Mainnet</span>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer z-20" onClick={() => document.getElementById('network')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="mono-label text-[10px]" style={{ color: 'var(--muted-foreground)' }}>SCROLL</span>
          <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center bg-surface shadow-md hover:border-primary transition-colors">
            <ChevronDown className="h-4 w-4 text-foreground" />
          </div>
        </div>
      </section>

      {/* Network Features Bento */}
      <section id="network" className="bg-background px-4 sm:px-6 lg:px-10 py-16 md:py-20 border-b border-line">
        <motion.div className="mx-auto max-w-[1400px]" {...reveal}>
          <p className="text-xs font-semibold uppercase text-primary tracking-widest">One network · every side of campus</p>
          <div className="mt-4 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ fontFamily: '"Fraunces", serif' }}>A trusted layer for campus life.</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">Identity is only the beginning. Almadox turns verification into access—to work, commerce, talent and recognition.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-12">
            <FeatureCard className="md:col-span-7" icon={WalletCards} eyebrow="Verified identity · SBT wallet" title="Your achievements, permanently yours." copy="College ID and facial verification create a bot-free identity. Credentials, work and recognition then collect in a non-transferable wallet that recruiters can trust." identity tags={['College verified', 'Face matched', 'SBT issued']} />
            <FeatureCard className="md:col-span-5" icon={BriefcaseBusiness} eyebrow="MicroGigs" title="Small tasks. Real earnings." copy="Complete short projects for verified campus teams and recruiters, earn money, and add proof of work to your record." tags={['Remote work', 'Paid tasks', 'Verified only']} />
            <FeatureCard className="md:col-span-5" icon={ShoppingBag} eyebrow="Campus marketplace" title="Trade inside a trusted circle." copy="Buy and sell books, devices, services and essentials with verified people from your own college community." tags={['Campus-only', 'Secure trade']} />
            <FeatureCard className="md:col-span-7" icon={Trophy} eyebrow="Live leaderboards" title="Recognition built on contribution." copy="Discover rising students and high-performing colleges through transparent rankings shaped by verified work and community impact." tags={['Merit-based', 'Transparent', 'Real-time']} />
          </div>
        </motion.div>
      </section>

      {/* Dynamic Data Sections (Leaderboards, Gigs) */}
      <section className="bg-surface/30 px-4 sm:px-6 lg:px-10 py-24 border-b border-line">
        <div className="mx-auto max-w-[1400px] space-y-24">
          
          {/* Leaderboards */}
          <motion.div {...reveal}>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2 text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>Live Leaderboards</h2>
                <p className="text-base text-muted-foreground">Top colleges and students ranked by performance</p>
              </div>
              <button onClick={() => navigate('/login')} className="btn-ghost text-xs px-5 py-2">View all <ArrowRight className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* College */}
              <div className="rounded-2xl border border-line bg-card p-6 sm:p-8 soft-shadow">
                <h3 className="font-semibold text-base mb-6 flex items-center gap-2 text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>
                  <Trophy className="h-5 w-5 text-accent" />
                  College rankings
                </h3>
                <div className="space-y-2">
                  {collegeLeaderboard.slice(0, 5).map((c, i) => (
                    <Rank key={c.id} number={String(i + 1).padStart(2, '0')} name={c.name} score={c.totalPoints.toString()} isTop={i === 0} />
                  ))}
                </div>
              </div>
              {/* Student */}
              <div className="rounded-2xl border border-line bg-card p-6 sm:p-8 soft-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="font-semibold text-base flex items-center gap-2 text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>
                    <Trophy className="h-5 w-5 text-primary" />
                    Student rankings
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {['all', 'cultural', 'sports', 'education'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setLbCategory(cat)}
                        className="mono-label px-2.5 py-1.5 rounded transition-colors"
                        style={{
                          background: lbCategory === cat ? 'color-mix(in oklab, var(--primary) 12%, transparent)' : 'transparent',
                          color: lbCategory === cat ? 'var(--primary)' : 'var(--muted-foreground)',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {studentLeaderboard.slice(0, 5).map((s, i) => (
                    <Rank key={s.id} number={String(i + 1).padStart(2, '0')} name={s.name} score={s.totalPoints.toString()} isTop={i === 0} sub={s.collegeName} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* MicroGigs */}
          <motion.div {...reveal}>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2 text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>Active MicroGigs</h2>
                <p className="text-base text-muted-foreground">Short tasks, real rewards</p>
              </div>
              <button onClick={() => navigate('/login')} className="btn-ghost text-xs px-5 py-2">Browse all <ArrowRight className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {gigs.map((g) => (
                <article key={g.id} className="rounded-2xl border border-line bg-card p-6 sm:p-8 soft-shadow hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full" style={{ borderColor: 'var(--line)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'color-mix(in oklab, var(--primary) 30%, transparent)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line)'}>
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <h3 className="font-semibold text-lg leading-snug text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: '"Fraunces", serif' }}>{g.title}</h3>
                    {g.paid && <span className="flex-shrink-0 mono-label px-3 py-1 rounded-full text-primary" style={{ background: 'color-mix(in oklab, var(--primary) 10%, transparent)' }}>₹{g.reward}</span>}
                  </div>
                  <p className="text-base mb-6 line-clamp-3 leading-relaxed text-muted-foreground">{g.description}</p>
                  <div className="flex justify-between text-xs text-muted-foreground border-t border-line/50 pt-5 mt-auto mono-label">
                    <span>{g.mode} · {g.duration}</span>
                    <span>{g.category}</span>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>

        </div>
      </section>

      {/* Community Roles */}
      <section id="community" className="bg-background px-4 sm:px-6 lg:px-10 py-24 border-b border-line">
        <motion.div className="mx-auto max-w-[1400px]" {...reveal}>
          <div className="grid gap-6 md:grid-cols-3">
            {roles.map(({ icon: Icon, title, copy }, index) => (
              <article key={title} className="rounded-[24px] bg-card p-8 sm:p-10 shadow-sm border border-line hover:border-primary/30 transition-all hover:shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative grid size-14 place-items-center rounded-xl bg-surface border border-line text-primary soft-shadow group-hover:scale-110 transition-transform duration-300"><Icon size={24} /></span>
                <p className="relative mt-8 text-xs font-semibold uppercase text-primary tracking-widest">0{index + 1}</p>
                <h3 className="relative mt-3 text-3xl font-bold text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>{title}</h3>
                <p className="relative mt-4 leading-relaxed text-muted-foreground text-lg">{copy}</p>
              </article>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Opportunities */}
      <section id="opportunities" className="bg-foreground px-4 sm:px-6 lg:px-10 py-32 text-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <motion.div className="mx-auto grid max-w-[1400px] gap-16 md:grid-cols-2 md:items-center relative z-10" {...reveal}>
          <div>
            <p className="text-xs font-semibold uppercase text-accent tracking-widest">Proof becomes opportunity</p>
            <h2 className="mt-6 max-w-lg text-4xl sm:text-5xl md:text-6xl font-bold leading-tight" style={{ fontFamily: '"Fraunces", serif' }}>A stronger signal than a polished résumé.</h2>
            <p className="mt-8 max-w-xl leading-relaxed text-background/65 text-lg sm:text-xl">Every verified credential, completed MicroGig and campus contribution strengthens a living record of what you can do.</p>
          </div>
          <div className="space-y-4">
            <ProofRow icon={BadgeCheck} text="College-issued identity and credentials" />
            <ProofRow icon={Sparkles} text="Verified project outcomes and endorsements" />
            <ProofRow icon={WalletCards} text="Portable, non-transferable SBT record" />
          </div>
        </motion.div>
      </section>

      {/* Join CTA */}
      <section id="join" className="golden-glow px-4 sm:px-6 lg:px-10 py-32 text-center border-t border-line">
        <motion.div className="mx-auto max-w-3xl" {...reveal}>
          <p className="text-xs font-semibold uppercase text-primary tracking-widest">The network is open</p>
          <h2 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-bold leading-tight" style={{ fontFamily: '"Fraunces", serif' }}>Bring your campus into the light.</h2>
          <p className="mx-auto mt-8 max-w-2xl text-xl text-muted-foreground leading-relaxed">Verify once. Connect everywhere. Start building a campus identity that creates real value.</p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')} className="btn-primary w-full sm:w-auto px-10 py-4 text-base">
              Join the network <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

// Subcomponents
function FeatureCard({ icon: Icon, eyebrow, title, copy, className, identity, tags }: { icon: any; eyebrow: string; title: string; copy: string; className: string; identity?: boolean; tags?: string[] }) {
  const color = identity ? 'var(--accent)' : 'var(--primary)';
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className={`${className} rounded-[32px] border border-line/80 bg-card p-8 sm:p-10 shadow-md hover:shadow-xl hover:border-primary/20 transition-all group flex flex-col`}>
      <div className="flex items-center justify-between mb-8">
        <span className="flex items-center justify-center size-14 rounded-2xl transition-colors" style={{
          background: `color-mix(in oklab, ${color} 15%, transparent)`,
          color: color
        }}>
          <Icon className="size-7" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: color }}>{eyebrow}</span>
      </div>
      <h3 className="max-w-md text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: '"Fraunces", serif' }}>{title}</h3>
      <p className="max-w-xl leading-relaxed text-muted-foreground text-lg mb-8 flex-1">{copy}</p>
      
      {tags && tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2.5 pt-4">
          {tags.map(t => <Pill key={t} color={color}>{t}</Pill>)}
        </div>
      )}
    </motion.article>
  );
}

function Pill({ children, color }: { children: React.ReactNode, color: string }) { 
  return <span className="rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide" style={{ background: `color-mix(in oklab, ${color} 10%, transparent)`, color: color, border: `1px solid color-mix(in oklab, ${color} 20%, transparent)`, fontFamily: '"Fraunces", serif' }}>{children}</span>; 
}

function Rank({ number, name, score, isTop, sub }: { number: string; name: string; score: string; isTop?: boolean, sub?: string }) { 
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface/50 border border-line/50 px-5 py-3.5 text-sm hover:bg-surface transition-colors">
      <div className="flex items-center gap-4">
        <b className={`font-mono text-base ${isTop ? "text-accent" : "text-muted-foreground"}`}>{number}</b>
        <div>
          <span className="font-semibold text-foreground text-base">{name}</span>
          {sub && <span className="text-xs ml-2 text-muted-foreground">{sub}</span>}
        </div>
      </div>
      <b className="font-mono text-primary text-base">{score} pts</b>
    </div>
  ); 
}

function ProofRow({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-full border border-line/20 bg-background/5 px-6 py-4 backdrop-blur-sm transition-colors hover:bg-background/10">
      <div className="flex items-center justify-center size-8 rounded-full bg-accent/20 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-base font-medium text-background">{text}</span>
    </div>
  );
}
