'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="pt-16 lg:pt-0 min-h-screen transition-[margin-left] duration-300"
        style={{ marginLeft: undefined }}
      >
        <div className={`${collapsed ? 'lg:ml-[68px]' : 'lg:ml-64'} transition-[margin-left] duration-300`}>
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
