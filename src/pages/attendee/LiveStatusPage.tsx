import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import {
  Activity,
  Users,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const LiveStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    drops,
    getDrop,
    user,
    getUserEntry,
    triggerDraw,
    socketConnected,
    simulateDisconnect,
    simulateReconnect,
    reconnectNotice,
    addToast,
  } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];
  const userEntry = getUserEntry(drop.id);

  // Live simulation tickers
  const [liveEntries, setLiveEntries] = useState(drop.totalEntriesCount || 4218);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (drop.status === 'open') {
        setLiveEntries(prev => prev + Math.floor(Math.random() * 5));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [drop.status]);

  const handleExecuteDraw = async () => {
    setIsDrawing(true);
    try {
      await triggerDraw(drop.id);
      setIsDrawing(false);
      navigate(`/drops/${drop.id}/result`);
    } catch (err: any) {
      setIsDrawing(false);
      addToast('error', 'Draw Failed', err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 pb-20">
      
      {/* Top Banner Breadcrumb */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Link to={`/drops/${drop.id}`} className="hover:text-brand-yellow">← {drop.name}</Link>
          <span>/</span>
          <span>Live Telemetry Room</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={socketConnected ? 'emerald' : 'rose'} dot>
            {socketConnected ? 'ROOM CONNECTED' : 'SOCKET DISCONNECTED'}
          </Badge>
        </div>
      </div>

      {/* Main Telemetry Cockpit */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-[#0d0e15] border border-white/15 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs font-mono text-brand-yellow uppercase tracking-widest block mb-1">
                REALTIME ROOM · {drop.mode === 'FAIR_DROP' ? 'FAIR DROP' : 'FCFS'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-stamp font-black text-white uppercase tracking-tight">
                {drop.name}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={socketConnected ? 'outline' : 'danger'}
                onClick={socketConnected ? simulateDisconnect : simulateReconnect}
                leftIcon={socketConnected ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              >
                {socketConnected ? 'Simulate Disconnect' : 'Reconnect Socket'}
              </Button>
            </div>
          </div>

          {/* Metric Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Live Count */}
            <div className="p-6 rounded-2xl bg-surface-100/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Verified Entries</span>
                <Users className="w-4 h-4 text-brand-yellow" />
              </div>
              <div className="text-4xl font-mono font-black text-white tracking-tight flex items-baseline gap-2">
                <span>{liveEntries.toLocaleString()}</span>
                <span className="text-xs text-emerald-400 font-sans font-bold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                  +18/s
                </span>
              </div>
              <p className="text-[11px] text-slate-400">All entries frozen when window expires.</p>
            </div>

            {/* Countdown */}
            <div className="p-6 rounded-2xl bg-surface-100/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Draw Window Time Left</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <Countdown targetDate={drop.windowEnd} size="md" />
              <p className="text-[11px] text-slate-400">Seeded shuffle triggers automatically at zero.</p>
            </div>

            {/* Seat Capacity */}
            <div className="p-6 rounded-2xl bg-surface-100/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Total Seats</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-4xl font-mono font-black text-brand-yellow">
                {drop.seatCount}
              </div>
              <p className="text-[11px] text-slate-400">Exactly 500 winners · Zero overselling.</p>
            </div>

          </div>

          {/* Current User Live Status Card */}
          <div className="p-5 rounded-2xl bg-surface-200 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase block">Your Entry State:</span>
              <div className="flex items-center gap-2">
                {userEntry ? (
                  <>
                    <span className="font-mono font-bold text-white text-base">{userEntry.receiptId}</span>
                    <Badge variant={userEntry.status === 'selected' ? 'emerald' : 'yellow'} dot>
                      {userEntry.status.toUpperCase()}
                    </Badge>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm">Not yet entered in this drop</span>
                )}
              </div>
            </div>

            {/* Trigger Draw Button (For reviewer/admin convenience) */}
            <div className="flex items-center gap-3">
              <Button
                size="md"
                variant="primary"
                isLoading={isDrawing}
                onClick={handleExecuteDraw}
                leftIcon={<Zap className="w-4 h-4 text-black" />}
              >
                Trigger Draw Now (Reveal Seed & Shuffle)
              </Button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
