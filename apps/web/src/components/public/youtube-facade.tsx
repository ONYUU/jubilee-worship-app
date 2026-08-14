"use client";

import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "@/lib/data/local-content";
import { formatMediaDate } from "@/lib/date";

export function YouTubeFacade({ item, showDetails = true }: { item: MediaItem; showDetails?: boolean }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/12 bg-night-850">
      <div className="relative aspect-video overflow-hidden bg-night-900">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.providerId}?autoplay=1&rel=0`}
            title={`${item.title} 영상 재생`}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              src={item.thumbnailPath}
              alt={item.thumbnailAlt}
              fill
              sizes="(max-width: 768px) 100vw, 900px"
              className="object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night-950/75 via-transparent to-transparent" />
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center"
              aria-label={`${item.title} 영상 재생`}
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/35 bg-night-950/70 text-ivory-50 backdrop-blur-md transition hover:scale-105 hover:border-brand-sky">
                <Play size={27} fill="currentColor" aria-hidden="true" />
              </span>
            </button>
          </>
        )}
      </div>

      {showDetails ? (
        <div className="p-6 md:p-8">
          <p className="text-sm text-brand-sky">
            {item.occurredOn ? (
              <>
                <time dateTime={item.occurredOn}>{formatMediaDate(item.occurredOn)}</time>
                <span aria-hidden="true"> · </span>
              </>
            ) : null}
            {item.sourceLabel}
          </p>
          <h3 className="mt-3 font-serif text-2xl font-semibold leading-snug tracking-tight">{item.title}</h3>
          <p className="mt-4 text-stone-300">{item.description}</p>
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ivory-50 underline decoration-white/25 underline-offset-4 hover:decoration-brand-sky"
          >
            YouTube에서 보기
            <ExternalLink size={15} aria-hidden="true" />
            <span className="sr-only">(새 창)</span>
          </a>
        </div>
      ) : null}
    </article>
  );
}
