import Image from "next/image";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  image?: { src: string; alt: string };
}

export function PageIntro({ eyebrow, title, description, image }: PageIntroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-night-900 pt-[76px] lg:pt-[84px]">
      {image ? (
        <>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-night-950 via-night-950/85 to-night-950/30" />
        </>
      ) : null}
      <div className="container-site relative flex min-h-[520px] items-end py-20 md:min-h-[600px] md:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title mt-6">{title}</h1>
          <p className="body-large mt-7 max-w-2xl">{description}</p>
        </div>
      </div>
    </section>
  );
}
