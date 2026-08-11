"use client";

import {
  Lightbox as GalleryLightbox,
  type LightboxItem,
} from "@/design-system/primitives/Lightbox";

export type { LightboxItem };

/** Backward-compatible single-item lightbox wrapper */
export function Lightbox({
  open,
  onOpenChange,
  item,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LightboxItem | null;
  className?: string;
}) {
  const items = item ? [item] : [];
  return (
    <GalleryLightbox
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      index={0}
      onIndexChange={() => undefined}
      className={className}
    />
  );
}
