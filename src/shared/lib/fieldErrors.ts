type Issue = { path: ReadonlyArray<PropertyKey>; message: string };

/**
 * First message per field from a zod issue list, keyed by dotted path.
 * Root-level issues (no path) are left to the caller's top-level message.
 */
export function fieldErrors(issues: ReadonlyArray<Issue>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.path.length === 0) continue;
    const key = issue.path.map(String).join(".");
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
