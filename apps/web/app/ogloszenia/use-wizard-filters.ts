'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetWizards, apiGetTopics, WizardDto, TopicDto } from '../lib/api';

const PAGE_SIZE = 12;

export function useWizardFilters() {
  const [wizards, setWizards] = useState<WizardDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [topics, setTopics] = useState<TopicDto[]>([]);

  // Pending filters (not yet applied)
  const [pendingName, setPendingName] = useState('');
  const [pendingTopics, setPendingTopics] = useState<string[]>([]);
  const [pendingRating, setPendingRating] = useState(0);

  // Active filters (currently applied)
  const [activeName, setActiveName] = useState('');
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [activeRating, setActiveRating] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = wizards.length < total;
  const hasActiveFilters = activeName !== '' || activeTopics.length > 0 || activeRating > 0;
  const hasPendingChanges =
    pendingName !== activeName ||
    pendingRating !== activeRating ||
    JSON.stringify(pendingTopics.slice().sort()) !== JSON.stringify(activeTopics.slice().sort());

  // Fetch topics on mount
  useEffect(() => {
    apiGetTopics()
      .then(r => setTopics(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, []);

  const fetchWizards = useCallback(async (
    currentOffset: number,
    name: string,
    topicIds: string[],
    minRating: number,
    append: boolean,
  ) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await apiGetWizards({
        limit: PAGE_SIZE,
        offset: currentOffset,
        name: name || undefined,
        topicIds: topicIds.length > 0 ? topicIds : undefined,
        minRating: minRating > 0 ? minRating : undefined,
      });
      setWizards(prev => append ? [...prev, ...res.wizards] : res.wizards);
      setTotal(res.total ?? res.wizardsCount);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchWizards(0, '', [], 0, false);
    setOffset(PAGE_SIZE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchWizards(offset, activeName, activeTopics, activeRating, true)
            .then(() => setOffset(o => o + PAGE_SIZE));
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset, activeName, activeTopics, activeRating, fetchWizards]);

  const applyFilters = () => {
    setActiveName(pendingName);
    setActiveTopics(pendingTopics);
    setActiveRating(pendingRating);
    setWizards([]);
    setOffset(PAGE_SIZE);
    fetchWizards(0, pendingName, pendingTopics, pendingRating, false);
  };

  const clearAll = () => {
    setPendingName('');
    setPendingTopics([]);
    setPendingRating(0);
    setActiveName('');
    setActiveTopics([]);
    setActiveRating(0);
    setWizards([]);
    setOffset(PAGE_SIZE);
    fetchWizards(0, '', [], 0, false);
  };

  return {
    wizards, total, loading, loadingMore, topics,
    hasMore, hasActiveFilters, hasPendingChanges,
    pendingName, pendingTopics, pendingRating,
    sentinelRef,
    setPendingName, setPendingTopics, setPendingRating,
    applyFilters, clearAll,
  };
}
