import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getTxHistory, explorerTxUrl, formatAddress } from '@/lib/web3';
import type { TxRecord } from '@/lib/web3';
import { Layers, ExternalLink, ArrowRightLeft, ShieldCheck, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StudentTransactions() {
  const [transactions, setTransactions] = useState<TxRecord[]>([]);

  useEffect(() => {
    setTransactions(getTxHistory());
    
    // Optional: set up a listener or interval if we wanted live updates from localStorage
    const interval = setInterval(() => {
      setTransactions(getTxHistory());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'SBT_MINT': return <ShieldCheck className="h-5 w-5 text-purple-500" />;
      case 'GIG_PAYOUT': return <Coins className="h-5 w-5 text-emerald-500" />;
      case 'POL_TRANSFER': return <ArrowRightLeft className="h-5 w-5 text-blue-500" />;
      default: return <Layers className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case 'SBT_MINT': return 'bg-purple-500/10 border-purple-500/30';
      case 'GIG_PAYOUT': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'POL_TRANSFER': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-secondary/40 border-border/50';
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Transaction History
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              On-chain activity on the Polygon Amoy Testnet.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 space-y-3">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto opacity-60" />
            <h3 className="text-base font-semibold text-foreground">No Transactions Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your wallet hasn't performed any on-chain actions yet. Complete MicroGigs or mint SBTs to see your history here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx, idx) => (
              <div 
                key={`${tx.hash}-${idx}`}
                className={`glass-card p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md ${getTxColor(tx.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-full bg-background border shadow-sm">
                    {getTxIcon(tx.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{tx.label}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase h-5 font-bold">
                        {tx.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/70">Tx Hash:</span>
                        <a 
                          href={explorerTxUrl(tx.hash)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="font-mono text-primary hover:underline flex items-center gap-1"
                        >
                          {formatAddress(tx.hash, 8)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-foreground/70">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                        <span className="text-foreground/50">•</span>
                        <span className="text-foreground/70">{tx.network}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side data */}
                <div className="md:text-right flex flex-col md:items-end gap-1 shrink-0 bg-background/50 p-3 rounded-lg border border-border/40">
                  {tx.amount && (
                    <div className="font-bold text-emerald-500 flex items-center gap-1">
                      + {tx.amount} POL
                    </div>
                  )}
                  {tx.tokenId !== undefined && (
                    <div className="font-semibold text-purple-600 dark:text-purple-400">
                      Token ID: #{tx.tokenId}
                    </div>
                  )}
                  {tx.contractAddress && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Contract: {formatAddress(tx.contractAddress)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
