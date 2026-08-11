"use client";

import { useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  titleSrOnly?: boolean;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  titleSrOnly,
}: ModalProps) {
  const descId = useId();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/85 backdrop-blur-md data-[state=open]:animate-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[90] max-h-[90dvh] w-[min(96vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface-muted p-5 shadow-glow outline-none sm:p-6",
            className,
          )}
          aria-describedby={description ? descId : undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title
                className={cn(
                  "display text-xl text-paper sm:text-2xl",
                  titleSrOnly && "sr-only",
                )}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description
                  id={descId}
                  className="mt-1 text-sm text-paper-muted"
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-ink/40 text-paper hover:border-spark-teal"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
