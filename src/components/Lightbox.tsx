"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type LightboxItem = {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
};

type LightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LightboxItem | null;
  className?: string;
};

export function Lightbox({
  open,
  onOpenChange,
  item,
  className,
}: LightboxProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/85 backdrop-blur-md data-[state=open]:animate-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[90] w-[min(96vw,960px)] -translate-x-1/2 -translate-y-1/2 outline-none",
            className,
          )}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">
            {item?.title ?? item?.alt ?? "Image preview"}
          </Dialog.Title>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-muted shadow-glow">
            {item ? (
              <div className="relative aspect-[16/10] w-full bg-ink">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 960px) 96vw, 960px"
                  priority
                />
              </div>
            ) : null}
            {(item?.title || item?.caption) && (
              <div className="border-t border-line px-4 py-3 sm:px-6">
                {item.title ? (
                  <p className="display text-lg text-paper">{item.title}</p>
                ) : null}
                {item.caption ? (
                  <p className="mt-1 text-sm text-paper-muted">
                    {item.caption}
                  </p>
                ) : null}
              </div>
            )}
            <Dialog.Close
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink/70 text-paper-on-dark backdrop-blur hover:border-spark-teal"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
