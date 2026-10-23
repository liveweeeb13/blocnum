import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database, Layout, Eye, LogOut, ExternalLink } from 'lucide-react';
import UserManagementModal from './UserManagementModal';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const allNavItems = [
    {
      id: 'database',
      label: 'Données',
      icon: Database,
    },
    {
      id: 'pages',
      label: 'Éditeur de Pages',
      icon: Layout,
    },
    {
      id: 'view',
      label: 'Tester en direct',
      icon: Eye,
    },
  ];
  const navItems = user?.role === 'admin' ? allNavItems : allNavItems.filter(item => item.id === 'view');

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="w-full px-0">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center">
            <a href="/" className="ml-3 inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 hover:text-indigo-700 transition-colors">
              <img src="/blocnum-pixel.svg" alt="" aria-hidden="true" className="h-7 w-7" style={{ imageRendering: 'pixelated' }} />
              <span>BlocNum</span>
            </a>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className={isActive ? 'inline' : 'sr-only'}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: Link to /page + User & Logout */}
          <div className="flex items-center gap-3">
            {/* Quick button to open public live page (/page) */}
            <a
              href="/page"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Ouvrir le site public en direct sans le bandeau studio"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Ouvrir le site public</span>
              <ExternalLink className="w-3 h-3 text-indigo-500 ml-0.5" />
            </a>

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            {/* User Avatar & Name */}
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              aria-label="Gérer les utilisateurs et le mot de passe"
              title="Gérer les utilisateurs et le mot de passe"
              className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center font-semibold text-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-medium text-gray-700 hidden md:inline">
                {user?.username}
              </span>
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Déconnexion"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {isAccountModalOpen && <UserManagementModal currentUser={user} onClose={() => setIsAccountModalOpen(false)} />}
    </header>
  );
}
