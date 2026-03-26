import { useState, useCallback } from 'react';
import type { ViewMode, DashboardItem } from '../types.js';

export function useModalState() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [previewItem, setPreviewItem] = useState<DashboardItem | null>(null);

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
  const closeModal = useCallback(() => {
    setViewMode('list');
    setPreviewItem(null);
  }, []);

  return {
    viewMode,
    setViewMode,
    previewItem,
    isModalOpen,
    openDetail,
    closeDetail,
    openRepos,
    openHelp,
    closeModal,
  };
}
