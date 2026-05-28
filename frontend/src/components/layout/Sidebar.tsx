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

  const userName = user?.name ?? 'Dhanush';
  const userEmail = user?.email ?? 'dhanush@researchmind.ai';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DN';

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0b0c10] border-r border-neutral-800/80 text-neutral-300 transition-all duration-300 ease-in-out font-sans
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Top: Logo + Name */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 bg-[#16a34a] text-white p-2 rounded-lg shadow-[0_4px_12px_rgba(22,163,74,0.2)]">
              <Lucide.Brain className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-white text-base tracking-tight font-sans">ResearchMind</span>
            )}
          </div>
          
          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-md text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            {isCollapsed ? (
              <Lucide.ChevronRight className="h-4 w-4" />
            ) : (
              <Lucide.ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Middle: Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = (Lucide as any)[item.icon] || Lucide.HelpCircle;
            
            // Check active matches for reports list, details or home routes
            const isReportsRoute = item.path === '/reports' && (location.pathname === '/reports' || location.pathname.startsWith('/report/'));
            const isSourceDetailRoute = item.path === '/library' && location.pathname.startsWith('/source/');
            const isActive = location.pathname === item.path || isReportsRoute || isSourceDetailRoute;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative font-medium text-xs sm:text-sm ${
                  isActive
                    ? 'bg-[#16a34a]/10 text-[#16a34a] border-l-2 border-[#16a34a] font-semibold'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-[#16a34a]' : 'text-neutral-400 group-hover:text-neutral-200'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                
                {/* Tooltip for collapsed sidebar */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-neutral-800 shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User avatar + name + logout button */}
        <div className="p-4 border-t border-neutral-800/80 bg-[#07080b]/50">
          <div className="flex items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-[#16a34a]/15 text-[#16a34a] border border-[#16a34a]/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {userInitials}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{userEmail}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
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
              className="mt-4 w-full flex items-center justify-center p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
              title="Logout"
            >
              <Lucide.LogOut className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
