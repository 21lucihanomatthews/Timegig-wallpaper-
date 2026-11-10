import React from 'react';
import { Home, Users, Zap, Compass, User } from 'lucide-react';

interface BottomMenuBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomMenuBar: React.FC<BottomMenuBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'tenant', label: 'Tenant', icon: Home, size: 'normal' },
    { id: 'referrals', label: 'Referrals', icon: Users, size: 'normal' },
    { id: 'gigs', label: 'GiGs', icon: Zap, size: 'large' },
    { id: 'seekers', label: 'Seekers', icon: Compass, size: 'normal' },
    { id: 'profile', label: 'Profile', icon: User, size: 'normal' },
  ];

  return (
    <nav aria-label="Main Navigation" className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t border-slate-200 shadow-2xl px-4 py-2">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLarge = tab.size === 'large';

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all text-slate-900 ${
                isActive
                   ? 'font-bold bg-slate-100 shadow-xs'
                  : 'font-medium hover:bg-slate-50'
              }`}
            >
              <Icon className={`${isLarge ? 'w-5 h-5' : 'w-4 h-4'} text-slate-900 stroke-[2]`} />
              <span className="text-[9px] text-slate-900">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
