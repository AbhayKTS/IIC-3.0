import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Video, Play, Sparkles, Plus, Star, Award, Clock, Users,
  Send, ExternalLink, CheckCircle2, ShieldCheck, Heart,
  BookOpen, Code2, Search, Filter, Coins, ArrowRight, Share2
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { saveTxRecord, explorerTxUrl } from '@/lib/web3';
import { api } from '@/lib/mockApi';
import RazorpayCheckoutModal from '@/components/RazorpayCheckoutModal';

interface Course {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorCollege?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: 'web3' | 'fullstack' | 'ai' | 'dsa' | 'devops' | 'other';
  pricePol: number; // 0 = free
  duration: string;
  tags: string[];
  likesCount: number;
  enrolledCount: number;
  createdAt: number;
}

const INITIAL_COURSES: Course[] = [
  {
    id: 'course_1',
    title: 'Building Production ERC-4337 Account Abstraction on Polygon',
    description: 'Master smart accounts, bundlers, and paymasters. From architecture to deploying zero-gas paymaster contracts on Polygon Amoy.',
    creatorId: 'student_ansh',
    creatorName: 'Ansh Sharma',
    creatorCollege: 'GLA University',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Standard embeddable video
    category: 'web3',
    pricePol: 2,
    duration: '48 mins',
    tags: ['Solidity', 'ERC-4337', 'Polygon', 'Smart Accounts'],
    likesCount: 142,
    enrolledCount: 380,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'course_2',
    title: 'Crack Hard LeetCode Graphs & Dynamic Programming in 60 Mins',
    description: 'Intuition-first problem walkthroughs of Dijkstra, Bellman-Ford, and 2D DP memoization patterns asked in Tier-1 tech interviews.',
    creatorId: 'student_priya',
    creatorName: 'Priya Verma',
    creatorCollege: 'IIT Delhi',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'dsa',
    pricePol: 0,
    duration: '64 mins',
    tags: ['LeetCode', 'Algorithms', 'Graphs', 'DP'],
    likesCount: 289,
    enrolledCount: 910,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'course_3',
    title: 'Fine-Tuning Llama 3 & Vector Search with pgvector & LangChain',
    description: 'End-to-end hands-on guide: chunking document embeddings, indexing into PostgreSQL vector store, and running low-latency RAG pipelines.',
    creatorId: 'student_rahul',
    creatorName: 'Rahul Sundaram',
    creatorCollege: 'NIT Trichy',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'ai',
    pricePol: 5,
    duration: '75 mins',
    tags: ['LLMs', 'RAG', 'Python', 'Vector DB'],
    likesCount: 98,
    enrolledCount: 240,
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'course_4',
    title: 'Modern Fullstack TypeScript: Next.js 14 Server Actions & Prisma',
    description: 'Learn enterprise patterns: optimistic updates, server mutations, caching strategies, and end-to-end type safety.',
    creatorId: 'student_tanmay',
    creatorName: 'Tanmay Saxena',
    creatorCollege: 'DTU',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'fullstack',
    pricePol: 1,
    duration: '52 mins',
    tags: ['Next.js', 'TypeScript', 'React', 'Prisma'],
    likesCount: 176,
    enrolledCount: 520,
    createdAt: Date.now() - 86400000 * 2,
  },
];

export default function StudentCourses() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student_demo';
  const studentName = session?.user?.name || (session?.user as any)?.email?.split('@')[0] || 'Student Creator';
  const collegeName = (session?.user as any)?.collegeName || (session?.user as any)?.college?.name || 'Your University';

  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Watch Video Modal
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  // Tip Modal
  const [tipOpen, setTipOpen] = useState(false);
  const [tipTargetCourse, setTipTargetCourse] = useState<Course | null>(null);
  const [tipAmount, setTipAmount] = useState('2');
  const [isTipping, setIsTipping] = useState(false);
  const [tipMode, setTipMode] = useState<'pol' | 'razorpay'>('razorpay');
  const [razorpayTipOpen, setRazorpayTipOpen] = useState(false);
  const [razorpayTipAmount, setRazorpayTipAmount] = useState(100);

  // Offer/Publish Course Modal
  const [publishOpen, setPublishOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState<Course['category']>('web3');
  const [pricePol, setPricePol] = useState('0');
  const [duration, setDuration] = useState('45 mins');
  const [tags, setTags] = useState('Solidity, Web3');
  const [isPublishing, setIsPublishing] = useState(false);

  // Real-time Firestore sync for published courses
  useEffect(() => {
    if (!db) return;

    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const liveCourses = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
          } as Course));

          // Merge live courses with initial catalog
          setCourses(prev => {
            const map = new Map<string, Course>();
            INITIAL_COURSES.forEach(c => map.set(c.id, c));
            liveCourses.forEach(c => map.set(c.id, c));
            return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
          });
        }
      }, (err) => {
        console.warn('Live courses listener notice:', err.message);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, []);

  // Filtered courses
  const filteredCourses = courses.filter(c => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Handle Publishing a New Course
  const handlePublishCourse = async () => {
    if (!title.trim() || !desc.trim() || !videoUrl.trim()) {
      toast.error('Please fill in course title, description, and video URL');
      return;
    }

    setIsPublishing(true);
    try {
      // Normalize video URL to embeddable format if YouTube
      let finalVideoUrl = videoUrl.trim();
      if (finalVideoUrl.includes('watch?v=')) {
        const videoId = finalVideoUrl.split('watch?v=')[1]?.split('&')[0];
        finalVideoUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (finalVideoUrl.includes('youtu.be/')) {
        const videoId = finalVideoUrl.split('youtu.be/')[1]?.split('?')[0];
        finalVideoUrl = `https://www.youtube.com/embed/${videoId}`;
      }

      const newCourse: Omit<Course, 'id'> = {
        title: title.trim(),
        description: desc.trim(),
        creatorId: studentId,
        creatorName: studentName,
        creatorCollege: collegeName,
        videoUrl: finalVideoUrl,
        category,
        pricePol: Math.max(0, parseFloat(pricePol) || 0),
        duration: duration.trim() || '30 mins',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        likesCount: 1,
        enrolledCount: 1,
        createdAt: Date.now(),
      };

      if (db) {
        await addDoc(collection(db, 'courses'), newCourse);
      }

      setCourses(prev => [{ id: `course_${Date.now()}`, ...newCourse }, ...prev]);
      toast.success('🎉 Your video course has been published to the student community!');
      setPublishOpen(false);
      setTitle('');
      setDesc('');
      setVideoUrl('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish course');
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Tipping with Polygon POL
  const handleTipCreator = async () => {
    if (!tipTargetCourse) return;
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid POL tip amount');
      return;
    }

    setIsTipping(true);
    try {
      // Record on-chain test transaction in wallet
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      saveTxRecord({
        hash: txHash,
        type: 'POL_TRANSFER',
        label: `Tipped ${amount} POL → ${tipTargetCourse.creatorName} (${tipTargetCourse.title.slice(0, 24)}...)`,
        amount: `-${amount}`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      // Send notification to course creator
      await api.createNotification({
        userId: tipTargetCourse.creatorId,
        type: 'course_tip',
        title: `🎁 Received ${amount} POL Tip!`,
        body: `${studentName} tipped you ${amount} POL on your video course "${tipTargetCourse.title}".`,
        meta: { courseId: tipTargetCourse.id, amount, txHash },
      }).catch(() => null);

      toast.success(`🎉 Sent ${amount} POL to ${tipTargetCourse.creatorName}! Tx: ${txHash.slice(0, 10)}...`);
      setTipOpen(false);
      setTipTargetCourse(null);
    } catch (err: any) {
      toast.error(err.message || 'Tip failed');
    } finally {
      setIsTipping(false);
    }
  };

  // Handle Razorpay INR Tip Success
  const handleRazorpayTipSuccess = async (paymentData: {
    razorpay_payment_id: string;
    amount: number;
  }) => {
    if (!tipTargetCourse) return;

    await api.createNotification({
      userId: tipTargetCourse.creatorId,
      type: 'course_tip',
      title: `🎁 Received ₹${paymentData.amount} Razorpay Tip!`,
      body: `${studentName} tipped you ₹${paymentData.amount} INR via Razorpay UPI on "${tipTargetCourse.title}".`,
      meta: { courseId: tipTargetCourse.id, amount: paymentData.amount, paymentId: paymentData.razorpay_payment_id },
    }).catch(() => null);

    toast.success(`🎉 Sent ₹${paymentData.amount} tip to ${tipTargetCourse.creatorName} via Razorpay! Ref: ${paymentData.razorpay_payment_id.slice(0, 12)}`);
    setTipOpen(false);
    setTipTargetCourse(null);
  };

  return (
    <DashboardLayout role="student">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-violet-500/10 via-primary/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Video className="h-3.5 w-3.5" /> Peer-to-Peer Learning & Video Masterclasses
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Student Video Courses & Code Walks
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Learn directly from top university peers who built production systems and aced contest rankings. Watch hands-on walkthroughs and tip creators with Polygon POL testnet tokens.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setPublishOpen(true)}
                className="gap-2 bg-primary text-primary-foreground font-semibold text-xs shadow-md"
              >
                <Plus className="h-4 w-4" /> Offer a Course
              </Button>
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="glass-card p-4 rounded-xl border border-border/80 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics, skills, student creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-secondary/20"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'web3', label: 'Web3 & Solidity' },
              { id: 'fullstack', label: 'Full Stack' },
              { id: 'ai', label: 'AI & LLMs' },
              { id: 'dsa', label: 'DSA & LeetCode' },
            ].map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="text-xs h-8 whitespace-nowrap"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="glass-card rounded-2xl border border-border/80 overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                {/* Video Preview Card / Thumbnail Header */}
                <div
                  onClick={() => setActiveCourse(course)}
                  className="relative aspect-video bg-[#0A0B0D] cursor-pointer flex items-center justify-center border-b border-border/60 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  
                  {/* Play Button Icon */}
                  <div className="h-12 w-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform z-20">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>

                  {/* Badges on Thumbnail */}
                  <div className="absolute top-3 left-3 z-20">
                    <Badge className="bg-black/60 backdrop-blur-md border-border/60 text-[10px] uppercase font-mono">
                      {course.category}
                    </Badge>
                  </div>

                  <div className="absolute top-3 right-3 z-20">
                    {course.pricePol > 0 ? (
                      <Badge className="bg-violet-600/90 text-white font-mono text-[10px] flex items-center gap-1">
                        <Coins className="h-3 w-3" /> {course.pricePol} POL
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600/90 text-white font-mono text-[10px]">
                        FREE
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 right-3 z-20 text-[11px] font-mono text-white/80 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {course.duration}
                  </div>
                </div>

                {/* Course Metadata */}
                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <h3
                      onClick={() => setActiveCourse(course)}
                      className="font-bold text-sm text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                    >
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px]">
                        {course.creatorName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-[11px]">
                          {course.creatorName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {course.creatorCollege}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {course.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setActiveCourse(course)}
                  className="flex-1 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                >
                  <Play className="h-3.5 w-3.5" /> Watch Lesson
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTipTargetCourse(course);
                    setTipOpen(true);
                  }}
                  className="text-xs gap-1 font-mono border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  title="Tip Creator with Polygon POL"
                >
                  <Coins className="h-3.5 w-3.5 text-violet-400" /> Tip
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Video Player Modal */}
        <Dialog open={!!activeCourse} onOpenChange={(open) => !open && setActiveCourse(null)}>
          <DialogContent className="bg-[#0A0B0D] border-[#2A2D33] text-[#F2F3F5] max-w-3xl p-0 overflow-hidden">
            {activeCourse && (
              <div>
                {/* Embed Video */}
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={activeCourse.videoUrl}
                    title={activeCourse.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {activeCourse.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">• {activeCourse.duration}</span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground">
                        {activeCourse.title}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeCourse.description}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setTipTargetCourse(activeCourse);
                        setTipOpen(true);
                      }}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs gap-1.5 shrink-0"
                    >
                      <Coins className="h-3.5 w-3.5" /> Tip in POL
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Creator: <strong className="text-foreground">{activeCourse.creatorName}</strong> ({activeCourse.creatorCollege})</span>
                    </div>
                    <span className="text-muted-foreground">{activeCourse.enrolledCount} Students Enrolled</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tip with Polygon Dialog */}
        <Dialog open={tipOpen} onOpenChange={setTipOpen}>
          <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono">
                <Coins className="h-4 w-4 text-violet-400" />
                Tip Creator in Polygon (POL)
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A8F98]">
                Reward <strong className="text-foreground">{tipTargetCourse?.creatorName}</strong> directly for this codebase walkthrough.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Payment Mode Selector */}
              <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-[#2A2D33]">
                <button
                  type="button"
                  onClick={() => setTipMode('razorpay')}
                  className={`py-1.5 text-xs font-mono rounded-md transition-all ${
                    tipMode === 'razorpay'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  ⚡ Razorpay (INR UPI)
                </button>
                <button
                  type="button"
                  onClick={() => setTipMode('pol')}
                  className={`py-1.5 text-xs font-mono rounded-md transition-all ${
                    tipMode === 'pol'
                      ? 'bg-violet-600 text-white font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  🟣 Polygon (POL)
                </button>
              </div>

              {tipMode === 'razorpay' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-foreground font-medium">
                      Tip Amount (INR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
                      <Input
                        type="number"
                        value={razorpayTipAmount}
                        onChange={(e) => setRazorpayTipAmount(Math.max(1, parseInt(e.target.value) || 0))}
                        placeholder="100"
                        className="bg-[#0A0B0D] border-[#2A2D33] pl-7 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Presets INR */}
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 250, 500].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRazorpayTipAmount(amt)}
                        className={`font-mono text-xs ${
                          razorpayTipAmount === amt ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-[#2A2D33]'
                        }`}
                      >
                        ₹{amt}
                      </Button>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0B0D] border border-[#2A2D33] text-xs font-mono space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gateway:</span>
                      <span className="text-blue-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Razorpay Fast UPI
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Recipient:</span>
                      <span className="text-primary truncate max-w-[200px]">{tipTargetCourse?.creatorName}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-foreground font-medium">
                      Tip Amount (POL)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.target.value)}
                        placeholder="2"
                        className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-violet-400 font-mono font-bold">POL</span>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="grid grid-cols-4 gap-2">
                    {['1', '2', '5', '10'].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTipAmount(amt)}
                        className={`font-mono text-xs ${
                          tipAmount === amt ? 'border-violet-500 text-violet-400 bg-violet-500/10' : 'border-[#2A2D33]'
                        }`}
                      >
                        {amt} POL
                      </Button>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0B0D] border border-[#2A2D33] text-xs font-mono space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Network:</span>
                      <span className="text-foreground">Polygon Amoy Testnet</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Recipient:</span>
                      <span className="text-primary truncate max-w-[200px]">{tipTargetCourse?.creatorName}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-[#2A2D33]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTipOpen(false)}
                disabled={isTipping}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              {tipMode === 'razorpay' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setTipOpen(false);
                    setRazorpayTipOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold gap-1.5 shadow-md shadow-blue-500/20"
                >
                  Pay ₹{razorpayTipAmount} via Razorpay
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleTipCreator}
                  disabled={isTipping || !tipAmount}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-semibold gap-1.5"
                >
                  {isTipping ? 'Sending on Polygon...' : `Send ${tipAmount} POL Tip`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish/Offer Course Dialog */}
        <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
          <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono">
                <Video className="h-4 w-4 text-primary" />
                Publish Video Course / Code Walk
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A8F98]">
                Share your engineering knowledge with other university students. Set a free access tier or charge POL tokens.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono">Course Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master React Fiber & Concurrent Mode in 40 Mins"
                  className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono">Description & Takeaways</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What will students learn from this video lesson?"
                  rows={3}
                  className="w-full rounded-md bg-[#0A0B0D] border border-[#2A2D33] p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono">Video URL (YouTube or Direct MP4)</label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-9 rounded-md bg-[#0A0B0D] border border-[#2A2D33] px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="web3">Web3 & Solidity</option>
                    <option value="fullstack">Full Stack</option>
                    <option value="ai">AI & LLMs</option>
                    <option value="dsa">DSA & LeetCode</option>
                    <option value="devops">Cloud & DevOps</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Price (POL) · 0 for Free</label>
                  <Input
                    type="number"
                    value={pricePol}
                    onChange={(e) => setPricePol(e.target.value)}
                    placeholder="0"
                    className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Estimated Duration</label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 45 mins"
                    className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Tags (comma-separated)</label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="React, Hooks, Web"
                    className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-[#2A2D33]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPublishOpen(false)}
                disabled={isPublishing}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePublishCourse}
                disabled={isPublishing || !title.trim() || !videoUrl.trim()}
                className="bg-primary text-primary-foreground font-mono text-xs font-semibold"
              >
                {isPublishing ? 'Publishing...' : 'Publish Course'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Razorpay Tip Modal with Authentic Checkout Animation */}
        <RazorpayCheckoutModal
          isOpen={razorpayTipOpen}
          onClose={() => setRazorpayTipOpen(false)}
          amountInr={razorpayTipAmount}
          merchantName={`Tip ${tipTargetCourse?.creatorName || 'Student Creator'}`}
          prefillEmail={(session?.user as any)?.email || 'student@university.edu'}
          prefillName={studentName}
          onSuccess={handleRazorpayTipSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
