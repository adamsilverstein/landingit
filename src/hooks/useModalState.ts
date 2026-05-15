import { useState, useCallback } from 'react';
import type { ViewMode, DashboardItem } from '../types.js';

export function useModalState() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [previewItem, setPreviewItem] = useState<DashboardItem | null>(null);
  /** PR/issue the notifications view should be pre-filtered to (set via the PR table indicator). */
  const [notificationsPinnedItem, setNotificationsPinnedItem] =
    useState<DashboardItem | null>(null);

  const isModalOpen = viewMode !== 'list';

  const openDetail = useCallback((item: DashboardItem) => {
    setPreviewItem(item);
    setViewMode('detail');
  }, []);

  const closeDetail = useCallback(() => {
    setViewMode('list');
    setPreviewItem(null);
  }, []);

  const openRepos = useCallback(() => setViewMode('repos'), []);
  const openHelp = useCallback(() => setViewMode('help'), []);
  const openNotifications = useCallback((pinTo?: DashboardItem | null) => {
    setNotificationsPinnedItem(pinTo ?? null);
    setViewMode('notifications');
  }, []);
  const openRules = useCallback(() => setViewMode('notification-rules'), []);
  const closeModal = useCallback(() => {
    setViewMode('list');
    setPreviewItem(null);
    setNotificationsPinnedItem(null);
  }, []);

  return {
    viewMode,
    setViewMode,
    previewItem,
    notificationsPinnedItem,
    isModalOpen,
    openDetail,
    closeDetail,
    openRepos,
    openHelp,
    openNotifications,
    openRules,
    closeModal,
  };
}
