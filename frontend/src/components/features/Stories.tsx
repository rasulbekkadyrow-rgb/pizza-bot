'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStories } from '@/hooks/useCatalog';
import { useTelegram } from '@/hooks/useTelegram';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Story } from '@/lib/types';

/**
 * Instagram uslubidagi storis bloki:
 * gorizontal doiralar + to'liq ekranli ko'ruvchi (progress, tap-navigatsiya).
 */

const STORY_DURATION_MS = 5000;
const SEEN_KEY = 'pizza-stories-seen-v1';

export function Stories() {
  const { stories, isLoading } = useStories();
  const { haptic } = useTelegram();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [seen, setSeen] = useState<number[]>([]);

  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    } catch {
      /* ignore */
    }
  }, []);

  const markSeen = useCallback((id: number) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-5 py-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="skeleton h-[68px] w-[68px] rounded-full" />
            <div className="skeleton h-2.5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!stories.length) return null;

  return (
    <>
      <div className="no-scrollbar snap-row flex gap-3.5 overflow-x-auto px-5 py-1">
        {stories.map((story, i) => {
          const isSeen = seen.includes(story.id);
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => {
                haptic('light');
                setActiveIndex(i);
                markSeen(story.id);
              }}
              className="press flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'grid h-[68px] w-[68px] place-items-center rounded-full p-[2.5px] transition-opacity',
                  isSeen
                    ? 'bg-line'
                    : 'bg-[conic-gradient(from_180deg,#FF3B30,#FF9500,#FF3B30)]'
                )}
              >
                <span className="relative h-full w-full overflow-hidden rounded-full ring-[2.5px] ring-bg">
                  <Image
                    src={story.coverUrl}
                    alt={story.title}
                    fill
                    sizes="68px"
                    className="object-cover"
                  />
                </span>
              </span>
              <span className="max-w-[72px] truncate text-[11px] font-semibold text-ink">
                {story.title}
              </span>
            </button>
          );
        })}
      </div>

      <StoryViewer
        stories={stories}
        index={activeIndex}
        onIndexChange={(i) => {
          setActiveIndex(i);
          if (i !== null && stories[i]) markSeen(stories[i].id);
        }}
        onClose={() => setActiveIndex(null)}
      />
    </>
  );
}

// ── To'liq ekranli ko'ruvchi ──────────────────────────────────

function StoryViewer({
  stories,
  index,
  onIndexChange,
  onClose,
}: {
  stories: Story[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isOpen = index !== null;
  const story = isOpen ? stories[index] : null;

  // Progress taymeri
  useEffect(() => {
    if (!isOpen || isPaused) return;
    setProgress(0);

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const value = (Date.now() - startedAt) / STORY_DURATION_MS;
      if (value >= 1) {
        clearInterval(timer);
        if (index! + 1 < stories.length) onIndexChange(index! + 1);
        else onClose();
      } else {
        setProgress(value);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [isOpen, index, isPaused, stories.length, onIndexChange, onClose]);

  // Body lock
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const goPrev = () => (index! > 0 ? onIndexChange(index! - 1) : onClose());
  const goNext = () => (index! + 1 < stories.length ? onIndexChange(index! + 1) : onClose());

  return createPortal(
    <AnimatePresence>
      {isOpen && story && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[65] bg-black"
        >
          {/* Rasm */}
          <motion.div
            key={story.id}
            initial={{ scale: 1.06, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={story.imageUrl}
              alt={story.title}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/10 to-black/85" />
          </motion.div>

          {/* Progress chiziqlari */}
          <div className="absolute inset-x-3 top-[max(env(safe-area-inset-top),0.75rem)] flex gap-1.5">
            {stories.map((s, i) => (
              <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                  style={{ width: i < index! ? '100%' : i === index! ? `${progress * 100}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Sarlavha + yopish */}
          <div className="absolute inset-x-4 top-[calc(max(env(safe-area-inset-top),0.75rem)+1.25rem)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-[15px]"
                style={{ backgroundColor: story.accent }}
              >
                🍕
              </span>
              <span className="text-[14px] font-bold text-white drop-shadow">{story.title}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="press grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Tap zonalari */}
          <button
            type="button"
            aria-label="Oldingi"
            onClick={goPrev}
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            className="absolute inset-y-0 left-0 w-1/3"
          />
          <button
            type="button"
            aria-label="Keyingi"
            onClick={goNext}
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            className="absolute inset-y-0 right-0 w-1/3"
          />

          {/* Matn + CTA */}
          <div className="safe-bottom absolute inset-x-0 bottom-0 px-6 pb-5">
            <p className="mb-4 text-[17px] font-semibold leading-snug text-white drop-shadow-lg">
              {story.body}
            </p>
            {story.ctaLabel && story.ctaTarget && (
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  onClose();
                  router.push(story.ctaTarget!);
                }}
              >
                {story.ctaLabel}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
