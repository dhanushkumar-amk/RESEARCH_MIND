import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { NAV_ITEMS, ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const userName = user?.name ?? 'ResearchMind User';
  const userEmail = user?.email ?? 'No email available';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'RM';

  const getPageTitle = () => {
    const path = location.pathname;
    
    // Check main nav items
    const navItem = NAV_ITEMS.find((item) => item.path === path);
    if (navItem) return navItem.label;

    // Check specific/dynamic paths
    if (path === '/') return 'Landing';
    if (path.startsWith('/report/')) return 'Report Detail';
    if (path === '/onboarding') return 'Onboarding';
    if (path === '/forgot-password') return 'Reset Password';
    if (path === '/login') return 'Login';
    if (path === '/register') return 'Register';

    return 'ResearchMind';
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors"
          aria-label="Open menu"
        >
          <Lucide.Menu className="h-5 w-5" />
        </button>

        {/* Current page title */}
        <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
          aria-label="Search"
        >
          <Lucide.Search className="h-5 w-5" />
        </button>

        {/* Notifications button */}
        <button
          className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors relative"
          aria-label="Notifications"
        >
          <Lucide.Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        {/* User avatar and dropdown */}
        <div className="relative ml-2">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center focus:outline-none"
            aria-label="User menu"
          >
            <div className="h-8 w-8 rounded-full border border-gray-200 bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-emerald-150 transition-all">
              {userInitials}
            </div>
          </button>

          {isDropdownOpen && (
            <>
              {/* Overlay to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate(ROUTES.SETTINGS);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Lucide.Settings className="h-4 w-4" />
                  Settings
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                >
                  <Lucide.LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
