import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/mockApi';
import type { MarketplaceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

const SEED_FLAGGED_ITEMS: MarketplaceItem[] = [
  {
    id: 'm-flag-1',
    title: 'Hacked WiFi Pineapple & Deauth Dongle',
    category: 'Hardware & IoT',
    price: 6500,
    condition: 'Custom Firmware',
    description: 'Portable network penetration testing device. Preloaded with Kali scripts.',
    location: 'Hostel 3',
    sellerId: 's9',
    collegeId: 'all',
    status: 'available',
    flagged: true,
    flagReason: 'Campus security policy violation (unauthorized penetration testing equipment)',
    createdAt: '2026-09-08',
  },
];

export default function CollegeMarketplaceMod() {
  const [items, setItems] = useState<MarketplaceItem[]>(SEED_FLAGGED_ITEMS);

  useEffect(() => {
    loadFlaggedItems();
  }, []);

  const loadFlaggedItems = async () => {
    try {
      const data = await api.getMarketplaceItems().catch(() => null);
      if (data && Array.isArray(data)) {
        const flagged = data.filter((i) => i.flagged);
        if (flagged.length > 0) setItems(flagged);
      }
    } catch {
      //
    }
  };

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success('Report dismissed. Item remains active.');
  };

  const handleRemove = async (id: string) => {
    try {
      await api.deleteMarketplaceItem(id).catch(() => null);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Listing permanently removed from campus marketplace.');
    } catch {
      toast.error('Could not remove item');
    }
  };

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" /> Campus Marketplace Moderation
            </h1>
            <p className="text-xs text-muted-foreground">
              Review student-flagged listings for policy compliance, safety, and unauthorized hardware.
            </p>
          </div>
          <Badge variant="destructive" className="text-xs">
            {items.length} Flagged Reports
          </Badge>
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-70" />
            <h3 className="font-semibold text-foreground">Marketplace queue is clear</h3>
            <p className="text-xs text-muted-foreground">No flagged or policy-violating items detected.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="glass-card p-6 rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" /> Flagged for Review
                    </Badge>
                    <span className="text-xs font-bold text-foreground">₹{item.price.toLocaleString()}</span>
                  </div>

                  <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.description}</p>

                  <div className="p-3 rounded-lg bg-background/80 border border-destructive/20 text-xs text-destructive space-y-0.5">
                    <span className="font-semibold">Reason Reported:</span>
                    <p>{item.flagReason || 'Reported by campus students'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(item.id)}
                    className="text-xs"
                  >
                    Dismiss Report
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(item.id)}
                    className="text-xs gap-1.5 shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Listing
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
