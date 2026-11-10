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
    <nav aria-label="Main Navigation" className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t border-slate-200 shadow-2xl px-6 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLarge = tab.size === 'large';

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all text-slate-900 ${
                isActive
                  ? 'font-bold scale-105 bg-slate-100 shadow-xs'
                  : 'font-medium hover:bg-slate-50'
              }`}
            >
              <Icon className={`${isLarge ? 'w-7 h-7' : 'w-5 h-5'} text-slate-900 stroke-[2]`} />
              <span className="text-[11px] text-slate-900">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
