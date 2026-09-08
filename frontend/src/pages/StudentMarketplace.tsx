import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { MarketplaceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Search,
  Plus,
  Tag,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const SEED_ITEMS: MarketplaceItem[] = [
  {
    id: 'm-1',
    title: 'Raspberry Pi 4 Model B (4GB) + Sensor Starter Kit',
    category: 'Hardware & IoT',
    price: 3400,
    condition: 'Like New (Barely Used)',
    description: 'Complete IoT development bundle with 32GB SD card, power supply, breadboard, ultrasonic sensor, DHT11, and jumper wires for college lab projects.',
    location: 'Campus Hostel Block B',
    sellerId: 's1',
    collegeId: 'all',
    status: 'available',
    flagged: false,
    createdAt: '2026-09-06',
  },
  {
    id: 'm-2',
    title: 'Introduction to Algorithms (CLRS 4th Edition)',
    category: 'Books & Academics',
    price: 950,
    condition: 'Good (No markings)',
    description: 'Standard textbook for Data Structures & Advanced Algorithms. Clean pages, hardcover edition.',
    location: 'Central Library Kiosk',
    sellerId: 's2',
    collegeId: 'all',
    status: 'available',
    flagged: false,
    createdAt: '2026-09-07',
  },
  {
    id: 'm-3',
    title: 'Logitech MX Master 3S Wireless Mouse',
    category: 'Electronics',
    price: 4800,
    condition: 'Excellent',
    description: 'Perfect for long coding sessions and multitasking. USB-C charging, original box, and Bluetooth receiver included.',
    location: 'Tech Hub Cafeteria',
    sellerId: 's3',
    collegeId: 'all',
    status: 'available',
    flagged: false,
    createdAt: '2026-09-08',
  },
  {
    id: 'm-4',
    title: 'Arduino Uno R3 Ultimate Project Box',
    category: 'Hardware & IoT',
    price: 1200,
    condition: 'Like New',
    description: 'Original Arduino board with LCD display, servos, relay module, and resistance assortment.',
    location: 'Hostel 4',
    sellerId: 's4',
    collegeId: 'all',
    status: 'available',
    flagged: false,
    createdAt: '2026-09-05',
  },
];

export default function StudentMarketplace() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';

  const [items, setItems] = useState<MarketplaceItem[]>(SEED_ITEMS);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [listModalOpen, setListModalOpen] = useState(false);

  // New item form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newPrice, setNewPrice] = useState('');
  const [newCondition, setNewCondition] = useState('Good');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.getMarketplaceItems().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        const merged = [...data];
        SEED_ITEMS.forEach((seed) => {
          if (!merged.find((m) => m.id === seed.id)) merged.push(seed);
        });
        setItems(merged);
      }
    } catch {
      setItems(SEED_ITEMS);
    }
  };

  const handleReserve = async (item: MarketplaceItem) => {
    try {
      await api.reserveItem(item.id).catch(() => null);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'reserved' } : i))
      );
      toast.success(`Reserved "${item.title}"! Seller contact details unlocked.`);
    } catch {
      toast.error('Could not reserve item');
    }
  };

  const handleFlag = async (itemId: string) => {
    try {
      await api.flagItem(itemId, 'Suspicious listing or counterfeit item').catch(() => null);
      toast.info('Item reported for College Moderation review.');
    } catch {
      toast.error('Failed to report item');
    }
  };

  const handleCreateListing = async () => {
    if (!newTitle.trim() || !newPrice.trim()) {
      toast.error('Please enter title and price');
      return;
    }

    try {
      setSubmitting(true);
      const newItem: Omit<MarketplaceItem, 'id' | 'status' | 'flagged' | 'createdAt'> = {
        title: newTitle,
        category: newCategory,
        price: parseFloat(newPrice) || 500,
        condition: newCondition,
        description: newDesc,
        location: newLocation || 'Campus Pickup',
        sellerId: studentId,
        collegeId: (session?.user as any)?.collegeId || 'all',
      };

      await api.createMarketplaceItem(newItem).catch(() => null);

      setItems((prev) => [
        {
          ...newItem,
          id: `item_${Date.now()}`,
          status: 'available',
          flagged: false,
          createdAt: new Date().toISOString().split('T')[0],
        },
        ...prev,
      ]);

      toast.success('Listing published to campus marketplace!');
      setListModalOpen(false);
      setNewTitle('');
      setNewPrice('');
      setNewDesc('');
    } catch {
      toast.error('Failed to publish listing');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', 'Hardware & IoT', 'Books & Academics', 'Electronics'];

  const filtered = items.filter((item) => {
    const matchesCat = selectedCat === 'all' || item.category === selectedCat;
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" /> Campus Student Marketplace
            </h1>
            <p className="text-xs text-muted-foreground">
              Buy, sell, or exchange hardware development boards, course textbooks, and electronics within your verified campus community.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button onClick={() => setListModalOpen(true)} className="gap-1.5 text-xs shadow-sm">
              <Plus className="h-4 w-4" /> List Item
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-all capitalize ${
                selectedCat === cat
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/60 text-muted-foreground hover:bg-secondary/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass-card p-5 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all hover:shadow-lg group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[11px] border-primary/30 text-primary">
                    {item.category}
                  </Badge>
                  <div className="text-lg font-black text-emerald-500">
                    ₹{item.price.toLocaleString()}
                  </div>
                </div>

                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Condition: <strong className="text-foreground">{item.condition}</strong></span>
                  <span>{item.location}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <button
                  onClick={() => handleFlag(item.id)}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <AlertTriangle className="h-3 w-3" /> Report
                </button>

                {item.status === 'reserved' ? (
                  <Badge variant="secondary" className="text-xs">
                    Reserved
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleReserve(item)}
                    className="text-xs gap-1.5 shadow-sm"
                  >
                    Reserve & Chat
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* LIST ITEM MODAL */}
        <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> List Campus Item
              </DialogTitle>
              <DialogDescription>
                Publish item for sale to students with verified university credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Item Title *</label>
                <Input
                  placeholder="e.g. Raspberry Pi 4 kit / Engineering Math Book"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Price in ₹ (INR) *</label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Condition</label>
                  <Input
                    placeholder="Brand New / Good / Used"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Pickup Location</label>
                <Input
                  placeholder="e.g. Campus Library / Hostel Block"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Item Description *</label>
                <textarea
                  rows={3}
                  placeholder="Describe included accessories, usage history..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setListModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateListing} disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Listing'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
