import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Wallet,
  X,
} from 'lucide-react';

import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userName = user?.name ?? 'ResearchMind User';
  const userEmail = user?.email ?? 'No email available';
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'RM';

  const userFirstLetter = userName.trim().charAt(0).toUpperCase() || 'R';

  const creditsBalance = 5;

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Research', path: ROUTES.RESEARCH, icon: Search },
    { label: 'Library', path: ROUTES.LIBRARY, icon: BookOpen },
    { label: 'Reports', path: '/reports', icon: FileText },
  ];

  const dropdownItems = [
    { label: 'Profile', path: ROUTES.PROFILE, icon: User },
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Research', path: ROUTES.RESEARCH, icon: Search },
    { label: 'Library', path: ROUTES.LIBRARY, icon: BookOpen },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
  ];

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="bg-emerald-600 px-4 py-1.5 text-center text-xs font-semibold text-white">
        <span>ResearchMind workspace is live and ready for deep research.</span>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 lg:px-6">
        <div className="flex min-h-16 items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 lg:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>

            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-3 shrink-0">
              <div className="bg-emerald-500 text-white p-2 rounded-[8px] shadow-[0_6px_16px_rgba(16,185,129,0.22)]">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#0a0a0a] whitespace-nowrap">
                ResearchMind
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isReportsRoute = item.path === '/reports' && location.pathname.startsWith('/report');
                const isActive = location.pathname === item.path || isReportsRoute;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.RESEARCH)}
              className="hidden md:flex h-11 min-w-[170px] lg:min-w-[220px] items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-500 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-neutral-400" />
                <span className="font-medium">Search research...</span>
              </div>
              <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-400">
                Ctrl K
              </span>
            </button>

            <button
              onClick={() => navigate(ROUTES.RESEARCH)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 md:hidden"
              aria-label="Search"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            <button
              title={`${creditsBalance} credits left`}
              className="flex h-10 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-colors hover:bg-neutral-50"
            >
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>{creditsBalance}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen((open) => !open)}
                className={`flex h-10 items-center gap-2 rounded-full border bg-white pl-1.5 pr-3 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all ${
                  isDropdownOpen
                    ? 'border-emerald-300 ring-4 ring-emerald-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
                aria-label="User menu"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={userName}
                    className="h-7.5 w-7.5 rounded-full object-cover shadow-[0_4px_10px_rgba(16,185,129,0.15)]"
                  />
                ) : (
                  <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 text-white text-xs font-bold shadow-[0_4px_10px_rgba(16,185,129,0.15)]">
                    {userFirstLetter}
                  </div>
                )}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180 text-neutral-700' : 'text-neutral-400'}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 z-50 mt-3 w-64 rounded-3xl border border-neutral-200 bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
                    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={userName}
                            className="h-10 w-10 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
                            {userInitials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-neutral-900">{userName}</p>
                          <p className="truncate text-[11px] text-neutral-400">{userEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      {dropdownItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              setIsDropdownOpen(false);
                              navigate(item.path);
                            }}
                            className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                          >
                            <Icon className="h-4 w-4 text-neutral-400" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="mt-2 flex w-full items-center gap-2 rounded-2xl border-t border-neutral-100 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 lg:hidden">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isReportsRoute = item.path === '/reports' && location.pathname.startsWith('/report');
              const isActive = location.pathname === item.path || isReportsRoute;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
