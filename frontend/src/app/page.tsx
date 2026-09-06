'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Stories } from '@/components/features/Stories';
import { PizzaCarousel } from '@/components/features/PizzaCarousel';
import { BrandMarquee } from '@/components/features/BrandBackdrop';
import { HeroWidget } from '@/components/features/HeroWidget';
import { ProductCard, ProductCardSkeleton } from '@/components/features/ProductCard';
import { ProductSheet } from '@/components/features/ProductSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCatalog } from '@/hooks/useCatalog';
import type { Product } from '@/lib/types';

/**
 * Bosh sahifa:
 *   salomlashuv → storis → aylanuvchi karusel → CTA → xitlar → ishonch bloki
 */
export default function HomePage() {
  const router = useRouter();
  const { products, isLoading, error, retry } = useCatalog();
  const [selected, setSelected] = useState<Product | null>(null);

  // Karusel uchun — chegirmali va xit mahsulotlar oldinda
  const featured = products
    .filter((p) => p.isBestseller || p.discountPercent > 0)
    .slice(0, 5);

  const bestsellers = products.filter((p) => p.isBestseller).slice(0, 4);

  return (
    <>
      <Header />

      <div className="space-y-5 pt-4">
        {/* Storis */}
        <Stories />

        {/* Aylanuvchi karusel — sahifaning vizual markazi */}
        <section className="px-4">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : (
            <PizzaCarousel products={isLoading ? [] : featured} onOpen={setSelected} />
          )}
        </section>

        {/* Yuguruvchi lenta */}
        <BrandMarquee className="rounded-2xl" />

        {/* Asosiy harakatlar */}
        <div className="px-5">
          <HeroWidget />
        </div>

        {/* Xitlar */}
        <section className="px-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="flex items-center gap-1.5 text-[19px] font-extrabold tracking-tight text-ink">
              <Flame className="h-[18px] w-[18px] text-brand-500" strokeWidth={2.8} />
              Eng ko‘p sotilganlar
            </h2>
            <button
              type="button"
              onClick={() => router.push('/catalog')}
              className="press flex items-center gap-0.5 text-[13px] font-bold text-brand-500"
            >
              Barchasi
              <ChevronRight className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : bestsellers.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} onOpen={setSelected} />
                ))}
          </div>
        </section>

        {/* Ishonch bloki */}
        <section className="px-5">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { value: '30 daq', label: 'Yetkazish' },
              { value: '10 000+', label: 'Mijozlar' },
              { value: '4.9 ⭐️', label: 'Reyting' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl bg-surface p-3.5 text-center shadow-card">
                <p className="text-[17px] font-extrabold tracking-tight text-ink">{stat.value}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ProductSheet
        product={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
