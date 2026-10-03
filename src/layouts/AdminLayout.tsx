import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import {
  LayoutDashboard,
  Calendar,
  Grid,
  ShieldAlert,
  Lock,
  FileCheck2,
  LifeBuoy,
  Cpu,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, drops } = useApp();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedDropId, setSelectedDropId] = useState<string>(() => {
    return localStorage.getItem('fairdrop_admin_active_drop') || 'drop-jack-white-vault';
  });

  const [pendingAppealsCount, setPendingAppealsCount] = useState<number>(0);

  // Sync selected drop
  const handleSelectDrop = (dropId: string) => {
    setSelectedDropId(dropId);
    localStorage.setItem('fairdrop_admin_active_drop', dropId);
    // Dispatch custom event so pages can listen without page reload
    window.dispatchEvent(new CustomEvent('admin:activeDropChanged', { detail: { dropId } }));
  };

  // Fetch pending appeals count for the badge
  useEffect(() => {
    fetch('/api/admin/appeals?status=pending', {
      headers: getAdminHeaders(),
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.appeals)) {
          setPendingAppealsCount(d.appeals.length);
        } else if (d.counts?.pending !== undefined) {
          setPendingAppealsCount(d.counts.pending);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Drops', path: '/admin/drops', icon: Calendar },
    { label: 'Inventory', path: '/admin/inventory', icon: Grid },
    { label: 'Entries & Risk', path: '/admin/entries', icon: ShieldAlert },
    { label: 'Security', path: '/admin/security', icon: Lock },
    { label: 'Audit & Integrity', path: '/admin/audit', icon: FileCheck2 },
    { label: 'Appeals', path: '/admin/appeals', icon: LifeBuoy, badge: pendingAppealsCount > 0 ? pendingAppealsCount : null },
    { label: 'Lab', path: '/lab/attack-designer', icon: Cpu, isExternal: true },
  ];

  const isCurrent = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col lg:flex-row font-sans">
      
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0c14] border-r border-white/10 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand & Portal Badge */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center font-stamp font-black text-black text-lg shadow-glow-yellow">
              FD
            </div>
            <div>
              <span className="font-stamp text-base font-black tracking-tight text-white uppercase block leading-none">
                FAIR DROP
              </span>
              <span className="text-[10px] font-mono font-bold uppercase text-brand-yellow tracking-wider">
                ADMIN CONSOLE
              </span>
            </div>
          </Link>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (8 Items from Section 3) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isCurrent(item.path);

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-brand-yellow/15 text-brand-yellow font-bold border border-brand-yellow/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-yellow' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-white/5 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <span>v2.4.0-admin</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ================= RIGHT MAIN WRAPPER ================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#090b12]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Drop Selector (Persisted) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-400 hidden sm:inline">Event:</span>
              <div className="relative">
                <select
                  value={selectedDropId}
                  onChange={e => handleSelectDrop(e.target.value)}
                  className="appearance-none bg-surface-100 border border-white/15 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-white focus:outline-none focus:border-brand-yellow cursor-pointer"
                >
                  {drops.map(d => (
                    <option key={d.id} value={d.id} className="bg-[#0f111a] text-white">
                      {d.name} ({d.mode})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* User Profile & Actions (No Switch Account) */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30">
              {user.role || 'ORGANIZER'}
            </span>

            {/* User Name */}
            <span className="text-xs font-semibold text-white hidden md:inline">
              {user.displayName || user.email}
            </span>

            {/* Log Out Button */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        {/* Main Content View wrapped in Error Boundary */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AdminErrorBoundary>
            <Outlet context={{ selectedDropId }} />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
};
