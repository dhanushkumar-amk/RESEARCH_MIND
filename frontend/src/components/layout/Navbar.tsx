import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Brain, LogOut, Settings, User, HelpCircle, Menu, X, Bell } from 'lucide-react';
import { NAV_ITEMS, ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userName = user?.name ?? 'Dhanush';
  const userEmail = user?.email ?? 'dhanush@researchmind.ai';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DN';

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 font-sans antialiased">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          
          {/* Left: Brand Logo & Links */}
          <div className="flex items-center gap-6">
            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2.5">
              <div className="bg-[#16a34a] text-white p-1.5 rounded-md shadow-sm">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <span className="font-bold text-neutral-900 text-sm tracking-tight">ResearchMind</span>
            </Link>

            {/* Desktop Navigation Links (Shadcn style) */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              {NAV_ITEMS.map((item) => {
                const isReportsRoute = item.path === '/reports' && (location.pathname === '/reports' || location.pathname.startsWith('/report/'));
                const isSourceDetailRoute = item.path === '/library' && location.pathname.startsWith('/source/');
                const isActive = location.pathname === item.path || isReportsRoute || isSourceDetailRoute;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-neutral-100 text-neutral-900 font-bold' 
                        : 'hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions, Notifications & Avatar */}
          <div className="flex items-center gap-2">
            
            {/* Notification Dot */}
            <button className="p-2 text-neutral-450 hover:text-neutral-900 rounded-md transition-colors relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#16a34a] rounded-full" />
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center focus:outline-none"
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full border border-neutral-200 bg-[#16a34a]/10 text-[#16a34a] flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-neutral-100 transition-all cursor-pointer">
                  {userInitials}
                </div>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-lg shadow-md py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs font-medium text-neutral-700">
                    <div className="px-3.5 py-2.5 border-b border-neutral-100">
                      <p className="font-bold text-neutral-900">{userName}</p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">{userEmail}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate(ROUTES.SETTINGS);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4 text-neutral-400" />
                      Settings
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-red-650 hover:bg-red-50 flex items-center gap-2 border-t border-neutral-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-450 hover:text-neutral-900 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-neutral-200 lg:hidden bg-white px-4 py-3 space-y-1 text-xs font-semibold text-neutral-600 animate-in slide-in-from-top duration-150">
          {NAV_ITEMS.map((item) => {
            const isReportsRoute = item.path === '/reports' && (location.pathname === '/reports' || location.pathname.startsWith('/report/'));
            const isSourceDetailRoute = item.path === '/library' && location.pathname.startsWith('/source/');
            const isActive = location.pathname === item.path || isReportsRoute || isSourceDetailRoute;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md ${
                  isActive ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Navbar;
