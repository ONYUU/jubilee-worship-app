"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  optionalNumber,
  optionalString,
  parsePositiveId,
  requiredString,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin, requireOwner } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import { adminRecordIdSchema, galleryItemFormSchema } from "@/lib/admin/mobile-content-schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STAGING_PREFIX = "storage://gallery-staging/";
const PUBLIC_APP_GALLERY_PREFIX = "storage://public-media/app-gallery/";
const STAGING_OBJECT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,999}\.(?:jpe?g|png|webp|avif)$/i;

function stagingObjectPath(locator: string | null): string | null {
  if (!locator?.startsWith(STAGING_PREFIX)) return null;
  const path = locator.slice(STAGING_PREFIX.length);
  if (!STAGING_OBJECT_PATTERN.test(path) || path.split("/").includes("..")) return null;
  return path;
}

function destinationPath(sourcePath: string): string {
  const extension = sourcePath.split(".").pop()?.toLowerCase() ?? "webp";
  const now = new Date();
  return `app-gallery/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
}

function revokedDestinationPath(sourcePath: string): string {
  const extension = sourcePath.split(".").pop()?.toLowerCase() ?? "webp";
  const now = new Date();
  return `gallery/revoked/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
}

function revalidateGalleryPaths() {
  revalidatePath("/");
  revalidatePath("/media");
  revalidatePath("/admin");
  revalidatePath("/admin/app-gallery");
}

export async function saveGalleryItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = galleryItemFormSchema.safeParse({
    media_path: requiredString(formData.get("media_path")),
    thumbnail_path: optionalString(formData.get("thumbnail_path")),
    alt: requiredString(formData.get("alt")),
    caption: optionalString(formData.get("caption")),
    occurred_on: optionalString(formData.get("occurred_on")),
    sort_order: optionalNumber(formData.get("sort_order"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);

  if (id) {
    const { data: existing, error: existingError } = await supabase
      .from("gallery_items")
      .select("id,media_path,thumbnail_path,published,consent_confirmed_at")
      .eq("id", id.data)
      .maybeSingle();
    if (existingError || !existing || existing.published) {
      return actionError("비공개 갤러리 초안을 확인하지 못했습니다.");
    }
    const mediaChanged = existing.media_path !== parsed.data.media_path
      || (existing.thumbnail_path ?? null) !== (parsed.data.thumbnail_path ?? null);
    if (existing.consent_confirmed_at && mediaChanged) {
      return actionError("동의가 확인된 사진 파일은 바로 교체할 수 없습니다. 오너가 동의 확인을 해제한 뒤 파일을 바꿔 주세요.");
    }
  }

  const query = id
    ? supabase.from("gallery_items").update(parsed.data).eq("id", id.data).eq("published", false)
    : supabase.from("gallery_items").insert(parsed.data);
  const { data, error } = await query.select("id").single();
  if (error || !data) {
    return actionError("앱 갤러리 초안을 저장하지 못했습니다. 공개된 사진은 오너가 먼저 비공개로 전환해야 합니다.");
  }

  revalidateGalleryPaths();
  return actionSuccess(id ? "앱 갤러리 사진을 수정했습니다." : "앱 갤러리 사진을 등록했습니다.");
}

export async function deleteGalleryItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase
    .from("gallery_items")
    .delete()
    .eq("id", id.data)
    .eq("published", false)
    .select("id")
    .single();
  if (error || !data) return actionError("비공개 갤러리 초안만 삭제할 수 있습니다.");

  revalidateGalleryPaths();
  return actionSuccess("앱 갤러리 사진을 삭제했습니다.");
}

async function setGalleryConsentAction(formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("set_gallery_item_consent", {
    target_gallery_item_id: id.data,
    target_confirmed: true
  });
  if (error) return actionError("사진 공개 동의 확인 상태를 변경하지 못했습니다.");

  revalidateGalleryPaths();
  return actionSuccess("오너가 사진 공개 동의를 확인했습니다.");
}

export async function confirmGalleryConsentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setGalleryConsentAction(formData);
}

export async function revokeGalleryConsentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { data: item, error: itemError } = await supabase
    .from("gallery_items")
    .select("id,media_path,thumbnail_path,published,consent_confirmed_at")
    .eq("id", id.data)
    .maybeSingle();
  if (itemError || !item) return actionError("동의를 철회할 갤러리 사진을 확인하지 못했습니다.");
  if (!item.consent_confirmed_at) return actionError("이미 공개 동의가 해제된 사진입니다.");

  const { error: unpublishError } = await supabase.rpc("set_gallery_item_published", {
    target_gallery_item_id: id.data,
    target_published: false
  });
  if (unpublishError) return actionError("사진을 앱 목록에서 먼저 비공개로 전환하지 못했습니다.");
  revalidateGalleryPaths();

  const publicLocators = [item.media_path, item.thumbnail_path].filter(
    (value): value is string => typeof value === "string" && value.startsWith(PUBLIC_APP_GALLERY_PREFIX)
  );
  if (publicLocators.length === 0) {
    const { error: consentError } = await supabase.rpc("set_gallery_item_consent", {
      target_gallery_item_id: id.data,
      target_confirmed: false
    });
    if (consentError) return actionError("앱 목록에서는 숨겼지만 공개 동의 상태를 해제하지 못했습니다.");

    revalidateGalleryPaths();
    return actionSuccess("앱 목록에서 비공개 처리했습니다. 외부 원본 URL이나 CDN 캐시는 별도로 남아 있을 수 있습니다.");
  }

  const publicSources = new Map<string, string>();
  for (const locator of publicLocators) {
    const source = locator.slice(PUBLIC_APP_GALLERY_PREFIX.length);
    if (!STAGING_OBJECT_PATTERN.test(source) || source.split("/").includes("..")) {
      return actionError("앱 목록에서는 숨겼지만 공개 Storage 경로가 올바르지 않아 원본을 회수하지 못했습니다.");
    }
    publicSources.set(locator, source);
  }

  const authAdmin = createSupabaseAdminClient();
  if (!authAdmin) {
    return actionError("앱 목록에서는 숨겼지만 공개 원본을 회수하려면 서버 전용 SUPABASE_SECRET_KEY 설정이 필요합니다.");
  }

  const restorePublication = async (): Promise<boolean> => {
    if (!item.published) return true;
    const { error } = await supabase.rpc("set_gallery_item_published", {
      target_gallery_item_id: id.data,
      target_published: true
    });
    return !error;
  };

  const moved: Array<{ source: string; destination: string }> = [];
  const privateLocators = new Map<string, string>();
  for (const [locator, source] of publicSources) {
    const destination = revokedDestinationPath(source);
    const { error: moveError } = await authAdmin.storage
      .from("public-media")
      .move(source, destination, { destinationBucket: "gallery-staging" });
    if (moveError) {
      let restored = true;
      for (const previous of [...moved].reverse()) {
        const { error: restoreError } = await authAdmin.storage
          .from("gallery-staging")
          .move(previous.destination, previous.source, { destinationBucket: "public-media" });
        restored = restored && !restoreError;
      }
      const publicationRestored = restored ? await restorePublication() : false;
      revalidateGalleryPaths();
      if (restored && publicationRestored) {
        return actionError("공개 원본 회수에 실패해 Storage와 공개 상태를 이전 상태로 되돌렸습니다. 동의 철회를 다시 시도해 주세요.");
      }
      return actionError(restored
        ? "Storage는 이전 상태로 되돌렸지만 기존 앱 공개 상태를 복구하지 못했습니다. 사진은 앱 목록에서 숨겨져 있습니다."
        : "앱 목록에서는 숨겼지만 Storage 회수 중 일부 작업이 실패했습니다. 운영자가 객체 상태를 확인해야 합니다.");
    }
    moved.push({ source, destination });
    privateLocators.set(locator, `storage://gallery-staging/${destination}`);
  }

  const nextMediaPath = privateLocators.get(item.media_path) ?? item.media_path;
  const nextThumbnailPath = item.thumbnail_path
    ? privateLocators.get(item.thumbnail_path) ?? item.thumbnail_path
    : null;
  const updateBase = supabase
    .from("gallery_items")
    .update({ media_path: nextMediaPath, thumbnail_path: nextThumbnailPath })
    .eq("id", id.data)
    .eq("published", false)
    .eq("media_path", item.media_path);
  const updateQuery = item.thumbnail_path === null
    ? updateBase.is("thumbnail_path", null)
    : updateBase.eq("thumbnail_path", item.thumbnail_path);
  const { data: updated, error: updateError } = await updateQuery.select("id").maybeSingle();
  if (updateError || !updated) {
    let restored = true;
    for (const previous of [...moved].reverse()) {
      const { error: restoreError } = await authAdmin.storage
        .from("gallery-staging")
        .move(previous.destination, previous.source, { destinationBucket: "public-media" });
      restored = restored && !restoreError;
    }
    const publicationRestored = restored ? await restorePublication() : false;
    revalidateGalleryPaths();
    if (restored && publicationRestored) {
      return actionError("DB 경로 갱신에 실패해 Storage와 공개 상태를 이전 상태로 되돌렸습니다. 동의 철회를 다시 시도해 주세요.");
    }
    return actionError(restored
      ? "Storage는 이전 상태로 되돌렸지만 기존 앱 공개 상태를 복구하지 못했습니다. 사진은 앱 목록에서 숨겨져 있습니다."
      : "앱 목록에서는 숨겼지만 DB·Storage 상태가 일치하지 않을 수 있습니다. 운영자가 확인해야 합니다.");
  }

  const { error: consentError } = await supabase.rpc("set_gallery_item_consent", {
    target_gallery_item_id: id.data,
    target_confirmed: false
  });
  if (consentError) {
    revalidateGalleryPaths();
    return actionError("앱 목록과 공개 원본은 비공개 처리했지만 동의 감사 상태를 최종 확인하지 못했습니다.");
  }

  revalidateGalleryPaths();
  return actionSuccess("앱 목록에서 비공개 처리하고 공개 원본을 비공개 Storage로 회수했습니다. 기존 URL이나 CDN 캐시는 일정 시간 남을 수 있습니다.");
}

async function setGalleryPublishedAction(formData: FormData, published: boolean): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);
  let rollbackPromotion: (() => Promise<boolean>) | null = null;

  if (published) {
    const { data: item, error: itemError } = await supabase
      .from("gallery_items")
      .select("id,media_path,thumbnail_path,published,consent_confirmed_at")
      .eq("id", id.data)
      .maybeSingle();
    if (itemError || !item) return actionError("공개할 갤러리 초안을 확인하지 못했습니다.");
    if (!item.consent_confirmed_at) return actionError("오너가 인물·이용 동의를 먼저 확인해야 합니다.");

    const stagedLocators = [item.media_path, item.thumbnail_path].filter(
      (value): value is string => typeof value === "string" && value.startsWith(STAGING_PREFIX)
    );
    if (stagedLocators.length > 0) {
      const stagedSources = new Map<string, string>();
      for (const locator of stagedLocators) {
        const source = stagingObjectPath(locator);
        if (!source) return actionError("갤러리 스테이징 경로가 올바르지 않습니다.");
        stagedSources.set(locator, source);
      }

      const authAdmin = createSupabaseAdminClient();
      if (!authAdmin) {
        return actionError("비공개 이미지를 공개 Storage로 옮기려면 서버 전용 SUPABASE_SECRET_KEY 설정이 필요합니다.");
      }

      const promoted = new Map<string, string>();
      const moved: Array<{ source: string; destination: string }> = [];
      for (const [locator, source] of stagedSources) {
        const destination = destinationPath(source);
        const { error: moveError } = await authAdmin.storage
          .from("gallery-staging")
          .move(source, destination, { destinationBucket: "public-media" });
        if (moveError) {
          for (const previous of moved.reverse()) {
            await authAdmin.storage.from("public-media").move(previous.destination, previous.source, {
              destinationBucket: "gallery-staging"
            });
          }
          return actionError("이미지를 비공개 스테이징에서 공개 Storage로 옮기지 못했습니다.");
        }
        moved.push({ source, destination });
        promoted.set(locator, `storage://public-media/${destination}`);
      }

      const { data: updated, error: updateError } = await supabase
        .from("gallery_items")
        .update({
          media_path: promoted.get(item.media_path) ?? item.media_path,
          thumbnail_path: item.thumbnail_path ? promoted.get(item.thumbnail_path) ?? item.thumbnail_path : null
        })
        .eq("id", id.data)
        .eq("published", false)
        .select("id")
        .single();
      if (updateError || !updated) {
        for (const previous of [...moved].reverse()) {
          await authAdmin.storage.from("public-media").move(previous.destination, previous.source, {
            destinationBucket: "gallery-staging"
          });
        }
        return actionError("이미지는 옮겼지만 갤러리 경로를 갱신하지 못했습니다. Storage 상태를 확인해 주세요.");
      }

      const promotedMediaPath = promoted.get(item.media_path) ?? item.media_path;
      const promotedThumbnailPath = item.thumbnail_path ? promoted.get(item.thumbnail_path) ?? item.thumbnail_path : null;
      rollbackPromotion = async () => {
        const restored: Array<{ source: string; destination: string }> = [];
        for (const previous of [...moved].reverse()) {
          const { error: restoreError } = await authAdmin.storage
            .from("public-media")
            .move(previous.destination, previous.source, { destinationBucket: "gallery-staging" });
          if (restoreError) {
            for (const restoredObject of restored.reverse()) {
              await authAdmin.storage.from("gallery-staging").move(restoredObject.source, restoredObject.destination, {
                destinationBucket: "public-media"
              });
            }
            return false;
          }
          restored.push(previous);
        }

        const rollbackBase = supabase
          .from("gallery_items")
          .update({ media_path: item.media_path, thumbnail_path: item.thumbnail_path })
          .eq("id", id.data)
          .eq("published", false)
          .eq("media_path", promotedMediaPath);
        const rollbackQuery = promotedThumbnailPath === null
          ? rollbackBase.is("thumbnail_path", null)
          : rollbackBase.eq("thumbnail_path", promotedThumbnailPath);
        const { data: rolledBack, error: rollbackError } = await rollbackQuery.select("id").maybeSingle();
        if (!rollbackError && rolledBack) return true;

        for (const previous of moved) {
          await authAdmin.storage.from("gallery-staging").move(previous.source, previous.destination, {
            destinationBucket: "public-media"
          });
        }
        return false;
      };

      const { error: consentError } = await supabase.rpc("set_gallery_item_consent", {
        target_gallery_item_id: id.data,
        target_confirmed: true
      });
      if (consentError) {
        const rolledBack = await rollbackPromotion();
        revalidateGalleryPaths();
        return actionError(rolledBack
          ? "공개 경로 동의 확인에 실패해 이미지를 비공개 Storage로 되돌렸습니다. 사진은 앱에 공개하지 않았습니다."
          : "공개 경로 동의 확인에 실패했습니다. 사진은 앱에 공개하지 않았으며 Storage 상태를 확인해야 합니다.");
      }
    }
  }

  const { error } = await supabase.rpc("set_gallery_item_published", {
    target_gallery_item_id: id.data,
    target_published: published
  });
  if (error) {
    if (rollbackPromotion) {
      const rolledBack = await rollbackPromotion();
      revalidateGalleryPaths();
      return actionError(rolledBack
        ? "사진 공개에 실패해 이미지를 비공개 Storage로 되돌렸습니다. 동의 상태를 다시 확인해 주세요."
        : "사진을 공개하지 못했습니다. 앱에는 공개되지 않았지만 Storage 상태를 확인해야 합니다.");
    }
    return actionError(published
      ? "사진을 공개하지 못했습니다. 오너의 인물·이용 동의 확인이 필요합니다."
      : "사진을 비공개로 전환하지 못했습니다.");
  }

  revalidateGalleryPaths();
  return actionSuccess(published ? "사진을 앱 갤러리에 공개했습니다." : "사진을 비공개로 전환했습니다.");
}

export async function publishGalleryItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setGalleryPublishedAction(formData, true);
}

export async function unpublishGalleryItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setGalleryPublishedAction(formData, false);
}
