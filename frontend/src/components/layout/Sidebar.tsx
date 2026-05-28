import { useLocation, useNavigate, Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { NAV_ITEMS, ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userName = user?.name ?? 'ResearchMind User';
  const userEmail = user?.email ?? 'No email available';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'RM';

  const handleLogout = async () => {
    await logout();
    setIsMobileOpen(false);
    navigate(ROUTES.LOGIN);
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Top: Logo + Name */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-lg">
              <Lucide.Brain className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-gray-900 truncate">ResearchMind</span>
            )}
          </div>
          
          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            {isCollapsed ? (
              <Lucide.ChevronRight className="h-4 w-4" />
            ) : (
              <Lucide.ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Middle: Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = (Lucide as any)[item.icon] || Lucide.HelpCircle;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                
                {/* Tooltip for collapsed sidebar */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User avatar + name + logout button */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 rounded-full border border-gray-200 bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {userInitials}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Logout"
              >
                <Lucide.LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Collapsed logout icon */}
          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Logout"
            >
              <Lucide.LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
