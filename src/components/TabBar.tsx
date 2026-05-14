import React from 'react';
import type { MainTab } from '../types.js';

interface TabBarProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  pullsCount: number;
  unseenCount: number;
  notificationsUnreadCount: number;
}

export function TabBar({
  active,
  onChange,
  pullsCount,
  unseenCount,
  notificationsUnreadCount,
}: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Main views">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'pulls'}
        className={'tab' + (active === 'pulls' ? ' tab-active' : '')}
        onClick={() => onChange('pulls')}
      >
        <span className="tab-label">Pull Requests &amp; Issues</span>
        <span className="tab-count">{pullsCount}</span>
        {unseenCount > 0 && (
          <span className="tab-badge" title={`${unseenCount} with new activity`}>
            {unseenCount > 99 ? '99+' : unseenCount} new
          </span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'notifications'}
        className={'tab' + (active === 'notifications' ? ' tab-active' : '')}
        onClick={() => onChange('notifications')}
      >
        <span className="tab-label">Notifications</span>
        {notificationsUnreadCount > 0 && (
          <span className="tab-badge" title={`${notificationsUnreadCount} unread`}>
            {notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
