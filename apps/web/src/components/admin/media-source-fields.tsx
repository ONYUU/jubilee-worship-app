"use client";

import { useMemo, useState } from "react";
import { APPROVED_YOUTUBE_VIDEO_IDS, parseYouTubeVideoId } from "@jubilee/domain";
import { useAdminField } from "@/components/admin/admin-fields";

const APPROVED_YOUTUBE_VIDEO_ID_SET = new Set<string>(APPROVED_YOUTUBE_VIDEO_IDS);

export function MediaSourceFields({
  initialUrl = ""
}: {
  initialUrl?: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const parsedId = useMemo(() => parseYouTubeVideoId(url), [url]);
  const isApproved = parsedId !== null && APPROVED_YOUTUBE_VIDEO_ID_SET.has(parsedId);
  const urlField = useAdminField("external_url", true);
  const providerIdField = useAdminField("provider_id", true);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="text-sm font-semibold text-ivory-50 md:col-span-2">
        <label htmlFor={urlField.id}>YouTube 영상 URL</label>
        <input
          id={urlField.id}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3"
          name="external_url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-invalid={urlField.hasError || undefined}
          aria-describedby={urlField.describedBy}
        />
        <span id={urlField.hintId} className="mt-1 block text-xs font-normal text-stone-300">
          watch, youtu.be, live, Shorts 영상 URL을 입력하면 표준 watch URL로 저장됩니다.
        </span>
        {urlField.errors.length > 0 ? (
          <ul id={urlField.errorId} className="mt-1 space-y-1 text-xs font-normal text-danger">
            {urlField.errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="text-sm font-semibold text-ivory-50">
        <label htmlFor={providerIdField.id}>YouTube 영상 ID</label>
        <input
          id={providerIdField.id}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3 read-only:opacity-70"
          name="provider_id"
          value={parsedId ?? ""}
          readOnly
          aria-invalid={providerIdField.hasError || undefined}
          aria-describedby={providerIdField.describedBy}
        />
        <span id={providerIdField.hintId} className="mt-1 block text-xs font-normal text-stone-300">
          URL에서 자동으로 추출됩니다.
        </span>
        {providerIdField.errors.length > 0 ? (
          <ul id={providerIdField.errorId} className="mt-1 space-y-1 text-xs font-normal text-danger">
            {providerIdField.errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="rounded-xl border border-white/10 bg-night-950 p-3 text-sm text-stone-300">
        {parsedId ? (
          <>
            <p className={`font-semibold ${isApproved ? "text-success" : "text-brand-sun"}`}>
              {isApproved ? "승인된 공식 영상입니다." : "승인 목록에 없어 초안으로만 저장됩니다."}
            </p>
            <a
              className="mt-2 inline-block text-brand-sky underline"
              href={`https://www.youtube.com/watch?v=${parsedId}`}
              target="_blank"
              rel="noreferrer"
            >
              YouTube에서 영상 확인<span className="sr-only">(새 창)</span>
            </a>
          </>
        ) : (
          <p>지원하는 YouTube 영상 URL을 입력하면 영상 ID와 승인 여부를 확인합니다.</p>
        )}
      </div>
    </div>
  );
}
