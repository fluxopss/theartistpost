import type { PrismaClient } from "@prisma/client";

export type TopicDTO = {
  slug: string;
  name: string;
  kind: "genre" | "community";
};

export function toTopicDTO(topic: {
  slug: string;
  name: string;
  kind: string;
}): TopicDTO {
  return {
    slug: topic.slug,
    name: topic.name,
    kind: topic.kind === "genre" ? "genre" : "community",
  };
}

/** Active topics, curated order. */
export async function listTopics(prisma: PrismaClient): Promise<TopicDTO[]> {
  const topics = await prisma.topic.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return topics.map(toTopicDTO);
}
