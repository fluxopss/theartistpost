import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtistByHandle } from "@/features/posts/queries";
import { ArtistProfileView } from "@/features/artists/ArtistProfileView";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const artist = await getArtistByHandle(handle);
  if (!artist) return { title: "Artist" };
  return {
    title: artist.name,
    description: artist.bio ?? undefined,
  };
}

export default async function ArtistPage({ params }: Props) {
  const { handle } = await params;
  const artist = await getArtistByHandle(handle);
  if (!artist) notFound();
  return <ArtistProfileView artist={artist} />;
}
