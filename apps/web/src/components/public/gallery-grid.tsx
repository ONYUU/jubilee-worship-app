import Image from "next/image";
import type { GalleryImage } from "@/lib/data/local-content";

const HOME_GALLERY_PATHS = [
  "/images/gallery/sundoo-jubilee-01.webp",
  "/images/gallery/sundoo-jubilee-03.webp",
  "/images/gallery/sundoo-jubilee-04.webp",
  "/images/gallery/sundoo-jubilee-06.webp",
  "/images/gallery/sundoo-jubilee-08.webp"
] as const;

export function GalleryGrid({ images, home = false }: { images: GalleryImage[]; home?: boolean }) {
  const selected = home
    ? HOME_GALLERY_PATHS.map((path) => images.find((image) => image.path === path)).filter(
        (image): image is GalleryImage => Boolean(image)
      )
    : images;

  return (
    <div className={home ? "grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5" : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
      {selected.map((image, index) => (
        <figure
          key={image.path}
          className={`relative overflow-hidden bg-night-850 ${
            home
              ? `min-h-56 rounded-[20px] ${
                  index === 0
                    ? "col-span-2 md:col-span-7 md:min-h-[520px]"
                    : index === 1
                      ? "md:col-span-5 md:min-h-[520px]"
                      : index === 2
                        ? "md:col-span-4 md:min-h-[360px]"
                        : "md:col-span-4 md:min-h-[360px]"
                }`
              : "aspect-[4/3] rounded-[20px]"
          }`}
        >
          <Image
            src={home ? image.thumbnail : image.path}
            alt={image.alt}
            fill
            sizes={home ? "(max-width: 768px) 50vw, 45vw" : "(max-width: 640px) 100vw, 33vw"}
            className="object-cover transition-transform duration-500 hover:scale-[1.025]"
          />
        </figure>
      ))}
    </div>
  );
}
