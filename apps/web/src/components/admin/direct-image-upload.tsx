"use client";

import { useId, useState } from "react";
import { useAdminField } from "@/components/admin/admin-fields";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_STANDARD_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

type DirectImageUploadProps = {
  name: string;
  label: string;
  prefix: "brand" | "hero" | "gallery" | "team" | "og";
  bucket?: "public-media" | "gallery-staging";
  initialPath?: string | null;
  altName?: string;
  initialAlt?: string | null;
  altValue?: string;
  onAltChange?: (value: string) => void;
};

export function DirectImageUpload({
  name,
  label,
  prefix,
  bucket = "public-media",
  initialPath,
  altName,
  initialAlt,
  altValue,
  onAltChange
}: DirectImageUploadProps) {
  const id = useId();
  const pathField = useAdminField(name);
  const altField = useAdminField(altName ?? `${name}-upload-alt`);
  const [path, setPath] = useState(initialPath ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [internalAlt, setInternalAlt] = useState(initialAlt ?? "");
  const alt = altValue ?? internalAlt;
  const [source, setSource] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [exifRemoved, setExifRemoved] = useState(false);
  const [peopleConsent, setPeopleConsent] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) {
      setStatus("error");
      setMessage("업로드할 파일을 선택해 주세요.");
      return;
    }

    const extension = MIME_EXTENSIONS[file.type];
    if (!extension || file.size > MAX_STANDARD_UPLOAD_BYTES) {
      setStatus("error");
      setMessage("JPEG, PNG, WebP, AVIF 파일만 가능하며 최대 크기는 10MB입니다.");
      return;
    }

    if (!alt.trim() || !source.trim() || !rightsConfirmed || !exifRemoved || !peopleConsent) {
      setStatus("error");
      setMessage("대체 텍스트, 출처, 권리·EXIF·인물 동의 확인을 모두 완료해 주세요.");
      return;
    }

    setStatus("uploading");
    setMessage("Storage로 직접 업로드하고 있습니다.");

    try {
      const now = new Date();
      const objectPath = `${prefix}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
        cacheControl: bucket === "gallery-staging" ? "300" : "31536000",
        contentType: file.type,
        upsert: false,
        metadata: {
          alt: alt.trim(),
          source: source.trim(),
          rights_confirmed: true,
          exif_removed: true,
          people_consent: peopleConsent,
          approval_state: bucket === "gallery-staging" ? "staged_for_owner_review" : "approved_for_public_use",
          uploaded_at: now.toISOString()
        }
      });

      if (error) {
        throw error;
      }

      setPath(`storage://${bucket}/${objectPath}`);
      setStatus("success");
      setMessage(bucket === "gallery-staging"
        ? "비공개 갤러리 스테이징에 업로드했습니다. 초안을 저장한 뒤 오너 검수를 요청하세요."
        : "업로드했습니다. 아래 콘텐츠 저장 버튼을 눌러 경로를 반영해 주세요.");
    } catch {
      setStatus("error");
      setMessage("업로드하지 못했습니다. Supabase 설정, 로그인 상태, Storage 정책을 확인해 주세요.");
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-night-950/60 p-4" aria-labelledby={`${id}-label`}>
      <h3 id={`${id}-label`} className="text-sm font-bold text-ivory-50">
        {label}
      </h3>
      <input type="hidden" name={name} value={path} readOnly />
      <p className="mt-1 break-all text-xs text-stone-300">현재 경로: {path || "없음"}</p>
      {pathField.errors.length > 0 ? (
        <ul id={pathField.errorId} className="mt-2 space-y-1 text-xs text-danger">
          {pathField.errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
        </ul>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label htmlFor={pathField.id} className="text-sm text-ivory-50">
          이미지 파일
          <input
            id={pathField.id}
            className="mt-1 block w-full rounded-lg border border-white/15 bg-night-900 p-2 text-sm"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            aria-invalid={pathField.hasError || undefined}
            aria-describedby={pathField.describedBy}
          />
        </label>
        <label htmlFor={`${id}-source`} className="text-sm text-ivory-50">
          이미지 출처·권리자
          <input
            id={`${id}-source`}
            className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-night-900 px-3"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>
        <label htmlFor={altField.id} className="text-sm text-ivory-50 md:col-span-2">
          대체 텍스트
          <input
            id={altField.id}
            name={altName}
            className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-night-900 px-3"
            value={alt}
            onChange={(event) => {
              const value = event.target.value;
              if (onAltChange) {
                onAltChange(value);
              } else {
                setInternalAlt(value);
              }
            }}
            aria-invalid={altField.hasError || undefined}
            aria-describedby={altField.describedBy}
          />
          {altField.errors.length > 0 ? (
            <span id={altField.errorId} className="mt-1 block space-y-1 text-xs text-danger">
              {altField.errors.map((error, index) => <span className="block" key={`${error}-${index}`}>{error}</span>)}
            </span>
          ) : null}
        </label>
        <label htmlFor={`${id}-rights`} className="flex items-start gap-2 text-sm text-stone-300">
          <input id={`${id}-rights`} type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
          공개 게시에 필요한 저작권·이용 권한을 확인했습니다.
        </label>
        <label htmlFor={`${id}-exif`} className="flex items-start gap-2 text-sm text-stone-300">
          <input id={`${id}-exif`} type="checkbox" checked={exifRemoved} onChange={(event) => setExifRemoved(event.target.checked)} />
          EXIF 위치·기기 정보를 제거한 파일입니다.
        </label>
        <label htmlFor={`${id}-people-consent`} className="text-sm text-stone-300 md:col-span-2">
          식별 가능한 인물·미성년자 동의
          <select
            id={`${id}-people-consent`}
            className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-night-900 px-3 text-ivory-50"
            value={peopleConsent}
            onChange={(event) => setPeopleConsent(event.target.value)}
          >
            <option value="" disabled>확인 후 선택해 주세요</option>
            <option value="not_applicable">식별 가능한 인물이 없음</option>
            <option value="confirmed">내부 기준에 따른 공개 동의를 확인함</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={status === "uploading"}
        onClick={upload}
        className="mt-4 min-h-11 rounded-lg border border-brand-sky/60 px-4 py-2 text-sm font-bold text-ivory-50 hover:bg-brand-sky/10 disabled:opacity-60"
      >
        {status === "uploading" ? "업로드 중…" : "Storage에 직접 업로드"}
      </button>
      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-2 text-sm ${status === "error" ? "text-danger" : "text-stone-300"}`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
