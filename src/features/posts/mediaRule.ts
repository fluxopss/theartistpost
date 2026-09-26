/** Original TAP rule: a post is a photograph, a video, or a sound. */
export function mediaGap(mediaUrl: string | undefined | null): string | null {
  const url = mediaUrl?.trim() ?? "";
  if (!url) return "A TAP post needs a photograph, video, or sound.";
  if (
    url.startsWith("/") ||
    url.startsWith("https://") ||
    url.startsWith("http://")
  ) {
    return null;
  }
  return "Enter a valid media URL or upload a photograph";
}

export function mediaKindLabel(
  type: "IMAGE" | "VIDEO" | "EMBED" | "CANVAS" | string,
): string {
  if (type === "IMAGE") return "Photograph";
  if (type === "VIDEO") return "Video";
  if (type === "EMBED") return "Sound";
  return "Work";
}
