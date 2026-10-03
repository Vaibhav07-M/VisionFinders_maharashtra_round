import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Drop } from '@shared/types';
import {
  PlusCircle,
  PlayCircle,
  PauseCircle,
  Copy,
  ExternalLink,
  Edit2,
} from 'lucide-react';

export const DropsPage: React.FC = () => {
  const { drops, createDrop, updateDrop, addToast } = useApp();
  const [dropsList, setDropsList] = useState<Drop[]>(drops);
  const [searchValue, setSearchValue] = useState('');

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
          <Link to="/admin/drops/create">
            <Button
              size="md"
              variant="primary"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create New Drop
            </Button>
          </Link>
        }
      />

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
