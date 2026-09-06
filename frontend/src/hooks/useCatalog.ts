'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CatalogResponse, Story } from '@/lib/types';

/**
 * Katalogni bir marta yuklab, butun ilova bo'ylab ulashadi.
 * Modul darajasidagi kesh — sahifalar orasida qayta so'rov yubormaslik uchun.
 */

let catalogPromise: Promise<CatalogResponse> | null = null;
let storiesPromise: Promise<Story[]> | null = null;

export const DEFAULT_SETTINGS: CatalogResponse['settings'] = {
  currency: 'USD',
  currencySymbol: '$',
  deliveryFee: 250,
  freeDeliveryFrom: 3000,
};

export function useCatalog() {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    catalogPromise ??= api.getCatalog();

    catalogPromise
      .then((res) => alive && setData(res))
      .catch((err: Error) => {
        catalogPromise = null; // keyingi urinishda qayta so'raladi
        if (alive) setError(err.message);
      })
      .finally(() => alive && setIsLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  return {
    categories: data?.categories ?? [],
    products: data?.products ?? [],
    addons: data?.addons ?? [],
    settings: data?.settings ?? DEFAULT_SETTINGS,
    isLoading,
    error,
    retry: () => {
      catalogPromise = null;
      setError(null);
      setIsLoading(true);
      catalogPromise = api.getCatalog();
      catalogPromise
        .then(setData)
        .catch((err: Error) => setError(err.message))
        .finally(() => setIsLoading(false));
    },
  };
}

export function useStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    storiesPromise ??= api.getStories();

    storiesPromise
      .then((res) => alive && setStories(res))
      .catch(() => {
        storiesPromise = null;
      })
      .finally(() => alive && setIsLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  return { stories, isLoading };
}
