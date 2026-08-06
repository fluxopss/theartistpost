import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/features/posts/queries";
import { PostDetailView } from "@/features/posts/PostDetailView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post" };
  return {
    title: post.title,
    description: post.description ?? undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return <PostDetailView post={post} />;
}
