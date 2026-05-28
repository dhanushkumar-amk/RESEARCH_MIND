import { ReactNode } from 'react';
import Navbar from './Navbar';

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans antialiased text-neutral-900 selection:bg-green-100 selection:text-[#16a34a]">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
};

export default AppShell;
