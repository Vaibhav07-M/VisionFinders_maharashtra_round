import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Drop, TicketTier } from '@shared/types';
import { DEFAULT_TIERS } from '@shared/constants';
import {
  Calendar,
  PlusCircle,
  PlayCircle,
  PauseCircle,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  Ticket,
  Edit2,
  ArrowRight,
} from 'lucide-react';

export const DropsPage: React.FC = () => {
  const { drops, createDrop, updateDrop, addToast } = useApp();
  const [dropsList, setDropsList] = useState<Drop[]>(drops);
  const [searchValue, setSearchValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Nashville, TN');
  const [seatCount, setSeatCount] = useState(500);
  const [price, setPrice] = useState(2500);
  const [currency, setCurrency] = useState<'Rs' | 'USD'>('Rs');
  const [mode, setMode] = useState<'FAIR_DROP' | 'FCFS'>('FAIR_DROP');
  const [windowStart, setWindowStart] = useState(new Date().toISOString().substring(0, 16));
  const [windowEnd, setWindowEnd] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().substring(0, 16));
  const [holdDurationSec, setHoldDurationSec] = useState(300);
  const [formTiers, setFormTiers] = useState<TicketTier[]>(() => DEFAULT_TIERS.map(t => ({ ...t })));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDropsList(drops);
  }, [drops]);

  const filteredDrops = dropsList.filter(d =>
    d.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    d.artistOrHost?.toLowerCase().includes(searchValue.toLowerCase()) ||
    d.city?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleToggleStatus = async (drop: Drop) => {
    const nextStatus = drop.status === 'open' ? 'paused' : 'open';
    try {
      await updateDrop(drop.id, { status: nextStatus });
      addToast('success', 'Status Changed', `Drop "${drop.name}" is now ${nextStatus}.`);
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  const handleDuplicate = async (drop: Drop) => {
    try {
      const duplicated = await createDrop({
        name: `${drop.name} (Copy)`,
        artistOrHost: drop.artistOrHost,
        venue: drop.venue,
        city: drop.city,
        seatCount: drop.seatCount,
        price: drop.price,
        mode: drop.mode,
        holdDurationSec: drop.holdDurationSec,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        drawTime: new Date(Date.now() + 1000 * 60 * 65).toISOString(),
      });
      addToast('success', 'Drop Duplicated', `Created "${duplicated.name}".`);
    } catch (err: any) {
      addToast('error', 'Duplication Failed', err.message);
    }
  };

  const handleSaveDrop = async (publishImmediately: boolean) => {
    if (!name.trim()) {
      addToast('error', 'Validation Error', 'Event name is required.');
      return;
    }
    const startMs = new Date(windowStart).getTime();
    const endMs = new Date(windowEnd).getTime();
    if (endMs <= startMs) {
      addToast('error', 'Validation Error', 'Window end time must be after start time.');
      return;
    }

    const calculatedSeats = formTiers.reduce((acc, t) => acc + (Number(t.seatCount) || 0), 0) || Number(seatCount) || 500;
    const minTierPrice = formTiers.length > 0 ? Math.min(...formTiers.map(t => t.price)) : price;

    setIsSubmitting(true);
    try {
      await createDrop({
        name,
        artistOrHost: artist || 'Featured Host',
        venue: venue || 'The Grand Hall',
        city,
        seatCount: calculatedSeats,
        price: Number(price) || minTierPrice || 85,
        currency,
        mode,
        status: publishImmediately ? 'open' : 'draft',
        holdDurationSec: Number(holdDurationSec) || 300,
        windowStart: new Date(windowStart).toISOString(),
        windowEnd: new Date(windowEnd).toISOString(),
        drawTime: new Date(endMs + 1000 * 60 * 5).toISOString(),
        tiers: formTiers,
      });

      addToast('success', 'Drop Created', `Event "${name}" saved ${publishImmediately ? 'and published' : 'as draft'} with ${calculatedSeats} seats across 5 tiers.`);
      setIsCreating(false);
      // Reset
      setName('');
      setArtist('');
      setVenue('');
      setFormTiers(DEFAULT_TIERS.map(t => ({ ...t })));
    } catch (err: any) {
      addToast('error', 'Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Drop>[] = [
    {
      key: 'name',
      header: 'Event & Host',
      sortable: true,
      render: (d) => (
        <div className="space-y-0.5">
          <span className="font-bold text-white block">{d.name}</span>
          <span className="text-slate-400 text-[11px] font-mono">{d.artistOrHost} • {d.city}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (d) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
          d.status === 'open' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
          d.status === 'paused' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
          d.status === 'drawn' || d.status === 'completed' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
          'bg-white/5 text-slate-400 border-white/10'
        }`}>
          {d.status}
        </span>
      ),
    },
    {
      key: 'mode',
      header: 'Allocation Mode',
      render: (d) => (
        <span className="text-xs font-mono text-brand-yellow font-bold">
          {d.mode}
        </span>
      ),
    },
    {
      key: 'seatCount',
      header: 'Seats',
      render: (d) => (
        <span className="font-mono text-white">
          {d.seatCount} seats
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Ticket Price & Tiers',
      render: (d) => {
        const symbol = d.currency === 'USD' ? '$' : '₹';
        const minPrice = d.tiers && d.tiers.length > 0 ? Math.min(...d.tiers.map(t => t.price)) : d.price;
        const maxPrice = d.tiers && d.tiers.length > 0 ? Math.max(...d.tiers.map(t => t.price)) : d.price;
        return (
          <div className="space-y-0.5">
            <span className="font-mono text-xs font-bold text-brand-yellow block">
              {minPrice === maxPrice ? `${symbol}${minPrice}` : `${symbol}${minPrice.toLocaleString()} – ${symbol}${maxPrice.toLocaleString()}`}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Base: {symbol}{d.price} ({d.tiers?.length || 5} tiers)
            </span>
          </div>
        );
      },
    },
    {
      key: 'window',
      header: 'Window',
      render: (d) => (
        <div className="text-[11px] font-mono text-slate-400">
          <div>{new Date(d.windowStart).toLocaleDateString()}</div>
          <div>Closes: {new Date(d.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleToggleStatus(d)}
            className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            title={d.status === 'open' ? 'Pause Drop' : 'Resume Drop'}
          >
            {d.status === 'open' ? <PauseCircle className="w-3.5 h-3.5 text-amber-400" /> : <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          <Link
            to={`/admin/drops/${d.id}/edit`}
            className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            title="Edit Drop & Ticket Prices"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
          </Link>
          <button
            onClick={() => handleDuplicate(d)}
            className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            title="Duplicate Drop"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <Link
            to={`/drops/${d.id}`}
            target="_blank"
            className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            title="View Attendee Page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        category="PANEL B · CATALOG MANAGEMENT"
        title="Event Drops"
        description="Configure lottery drops, manage registration windows, ticket tiers, and view allocation status."
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/admin/drops/create">
              <Button
                size="md"
                variant="primary"
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Create New Drop
              </Button>
            </Link>
            <Button
              size="md"
              variant="outline"
              onClick={() => setIsCreating(!isCreating)}
            >
              {isCreating ? 'Close Form' : 'Quick Drawer'}
            </Button>
          </div>
        }
      />

      {/* Create / Edit Form Modal */}
      {isCreating && (
        <div className="p-6 rounded-2xl bg-[#0d0f17] border border-brand-yellow/30 shadow-2xl space-y-6 animate-scale-up mb-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-stamp font-black text-white uppercase tracking-tight">
                Create Allocation Drop
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Set window parameters, seat inventory count, and hold policy.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-sans">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-400 font-mono uppercase block">Event Title *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Jack White: The Twilight Echoes Vault Edition"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Artist / Host</label>
              <input
                type="text"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="e.g. Third Man Records"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Venue</label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Blue Room Theatre"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Allocation Mode</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white focus:outline-none focus:border-brand-yellow"
              >
                <option value="FAIR_DROP">Fair Drop (Verifiable Lottery)</option>
                <option value="FCFS">FCFS (Control Benchmark)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Total Seats</label>
              <input
                type="number"
                min="10"
                max="5000"
                value={seatCount}
                onChange={e => setSeatCount(parseInt(e.target.value) || 500)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Base Price (Rs)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(parseInt(e.target.value) || 85)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Hold Duration (Sec)</label>
              <input
                type="number"
                min="30"
                max="1800"
                value={holdDurationSec}
                onChange={e => setHoldDurationSec(parseInt(e.target.value) || 300)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Registration Window Start</label>
              <input
                type="datetime-local"
                value={windowStart}
                onChange={e => setWindowStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono uppercase block">Registration Window End</label>
              <input
                type="datetime-local"
                value={windowEnd}
                onChange={e => setWindowEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          {/* Active 5 Ticket Tiers & Pricing Configuration */}
          <div className="p-4 rounded-xl bg-surface-100 border border-brand-yellow/30 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-brand-yellow" />
                <h4 className="text-xs font-mono font-bold uppercase text-white">
                  Ticket Tiers & Price Configuration
                </h4>
              </div>
              <span className="text-[11px] font-mono text-brand-yellow">
                Total: {formTiers.reduce((acc, t) => acc + (t.seatCount || 0), 0)} Seats
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {formTiers.map((tier) => (
                <div key={tier.id} className="p-3 rounded-lg bg-[#090b12] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-white">
                      {tier.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tier.seatCount} seats
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase block">
                      Price ({currency === 'Rs' ? '₹' : '$'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tier.price}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormTiers(prev => prev.map(t => t.id === tier.id ? { ...t, price: val } : t));
                      }}
                      className="w-full px-2 py-1 text-xs bg-surface-100 border border-brand-yellow/30 rounded text-white font-mono font-bold focus:outline-none focus:border-brand-yellow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase block">
                      Seats
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tier.seatCount}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormTiers(prev => prev.map(t => t.id === tier.id ? { ...t, seatCount: val } : t));
                      }}
                      className="w-full px-2 py-1 text-xs bg-surface-100 border border-white/10 rounded text-white font-mono focus:outline-none focus:border-brand-yellow"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              size="md"
              variant="outline"
              onClick={() => handleSaveDrop(false)}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button>
            <Button
              size="md"
              variant="primary"
              onClick={() => handleSaveDrop(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Drop'}
            </Button>
          </div>
        </div>
      )}

      {/* Drops Table */}
      <DataTable
        columns={columns}
        data={filteredDrops}
        keyExtractor={d => d.id}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Filter events by name, host, or city..."
        totalRecords={filteredDrops.length}
        emptyTitle="No Drops Found"
        emptyDescription="Create your first fair drop allocation event using the button above."
      />
    </div>
  );
};
