import Link from "next/link";
import { tokenizeMentions } from "@/features/community/domain/mentions";
import { cn } from "@/shared/lib/cn";

/** Post text with @handles linked to profiles. Plain text otherwise: React escapes everything. */
export function MentionText({ body, className }: { body: string; className?: string }) {
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {tokenizeMentions(body).map((token, index) =>
        token.type === "mention" ? (
          <Link
            key={index}
            href={`/u/${encodeURIComponent(token.handle)}`}
            className="font-semibold text-spark-teal hover:underline"
          >
            {token.value}
          </Link>
        ) : (
          <span key={index}>{token.value}</span>
        ),
      )}
    </p>
  );
}
