"use client";

import { useState } from "react";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";

export function HeroImageUploads({
  desktopPath,
  mobilePath,
  initialAlt
}: {
  desktopPath: string | null;
  mobilePath: string | null;
  initialAlt: string | null;
}) {
  const [alt, setAlt] = useState(initialAlt ?? "");

  return (
    <>
      <DirectImageUpload
        name="hero_media_path"
        label="Hero 데스크톱 이미지·공통 대체 텍스트"
        prefix="hero"
        initialPath={desktopPath}
        altName="hero_media_alt"
        initialAlt={initialAlt}
        altValue={alt}
        onAltChange={setAlt}
      />
      <DirectImageUpload
        name="hero_media_mobile_path"
        label="Hero 모바일 이미지·공통 대체 텍스트"
        prefix="hero"
        initialPath={mobilePath}
        initialAlt={initialAlt}
        altValue={alt}
        onAltChange={setAlt}
      />
    </>
  );
}
