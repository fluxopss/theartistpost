import type { EventDTO } from "@/server/api/dto";

/** "Food & vendors" on a night. Nothing renders when the list is empty. */
export function VendorList({ vendors }: { vendors: EventDTO["vendors"] }) {
  if (!vendors || vendors.length === 0) return null;
  return (
    <section
      aria-labelledby="vendors-title"
      className="max-w-2xl rounded-3xl border border-line bg-surface-glass p-5 sm:p-6"
    >
      <h2 id="vendors-title" className="display text-2xl text-paper">
        Food &amp; vendors
      </h2>
      <p className="mt-1 text-sm text-paper-muted">
        Local makers sharing the night with us.
      </p>
      <ul className="mt-4 divide-y divide-line">
        {vendors.map((vendor, index) => (
          <li
            key={`${vendor.name}-${index}`}
            className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0"
          >
            {vendor.url ? (
              <a
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-paper underline-offset-4 hover:text-spark-teal hover:underline"
              >
                {vendor.name}
              </a>
            ) : (
              <span className="font-semibold text-paper">{vendor.name}</span>
            )}
            {vendor.offering ? (
              <span className="text-sm text-paper-muted">{vendor.offering}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
