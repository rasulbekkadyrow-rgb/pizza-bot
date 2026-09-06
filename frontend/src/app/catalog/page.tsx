'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/Header';
import { CategoryFilter, FILTER_ALL, FILTER_BESTSELLERS } from '@/components/features/CategoryFilter';
import { ProductCard, ProductCardSkeleton } from '@/components/features/ProductCard';
import { ProductSheet } from '@/components/features/ProductSheet';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import { useCatalog } from '@/hooks/useCatalog';
import type { Product } from '@/lib/types';

/** Aksiyalar uchun maxsus filtr (`/catalog?filter=sale`). */
const FILTER_SALE = '__sale__';

export default function CatalogPage() {
  const { categories, products, isLoading, error, retry } = useCatalog();

  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  // Hero'dagi «Aksiyalar» tugmasidan kelgan bo'lsa
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('filter');
    if (param === 'sale') setFilter(FILTER_SALE);
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesFilter =
        filter === FILTER_ALL ||
        (filter === FILTER_BESTSELLERS && product.isBestseller) ||
        (filter === FILTER_SALE && product.discountPercent > 0) ||
        product.category?.slug === filter;

      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.ingredients.some((i) => i.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [products, filter, search]);

  return (
    <>
      <PageHeader title="Katalog" subtitle={`${products.length} ta mahsulot`} />

      <div className="space-y-4 px-5 pt-4">
        {/* Qidiruv */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 focus-within:border-brand-500/70">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={2.4} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pitssa, ichimlik, sous…"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Tozalash"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line/70 text-muted"
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Filtrlar */}
        <CategoryFilter
          categories={categories}
          value={filter === FILTER_SALE ? FILTER_ALL : filter}
          onChange={setFilter}
        />

        {/* Ro'yxat */}
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Hech narsa topilmadi"
            description="Boshqa so‘z bilan qidiring yoki filtrni o‘zgartiring."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2">
            {visible.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>

      <ProductSheet
        product={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
