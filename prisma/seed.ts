import { PrismaClient, type MediaType, type PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

const tags = [
  { name: "Abstract", slug: "abstract" },
  { name: "3D", slug: "3d" },
  { name: "Photography", slug: "photography" },
  { name: "Motion", slug: "motion" },
  { name: "Collage", slug: "collage" },
  { name: "Neon", slug: "neon" },
];

const artists = [
  {
    email: "luna@theartistpost.org",
    name: "Luna Voss",
    handle: "lunavoss",
    bio: "Light sculptor exploring grain, glare, and late-night city hush.",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    socialLinks: {
      website: "https://example.com/luna",
      instagram: "https://instagram.com/lunavoss",
    },
  },
  {
    email: "kai@theartistpost.org",
    name: "Kai Chan",
    handle: "kaichan",
    bio: "Spatial designer building soft architectures for restless screens.",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    socialLinks: {
      behance: "https://behance.net/kaichan",
      twitter: "https://x.com/kaichan",
    },
  },
  {
    email: "mira@theartistpost.org",
    name: "Mira Noir",
    handle: "miranoir",
    bio: "Collage poet stitching archival dust into luminous sequences.",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    socialLinks: {
      website: "https://example.com/mira",
      instagram: "https://instagram.com/miranoir",
    },
  },
];

type SeedPost = {
  title: string;
  slug: string;
  description: string;
  mediaUrl: string;
  mediaType: MediaType;
  featured: boolean;
  viewCount: number;
  artistEmail: string;
  tagSlugs: string[];
  status: PostStatus;
  theme: Record<string, string>;
};

const posts: SeedPost[] = [
  {
    title: "Midnight Filament",
    slug: "midnight-filament",
    description:
      "A field study of electric threads drifting through velvet air.",
    mediaUrl:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=80",
    mediaType: "IMAGE",
    featured: false,
    viewCount: 1842,
    artistEmail: "luna@theartistpost.org",
    tagSlugs: ["abstract", "neon", "motion"],
    status: "PUBLISHED",
    theme: { primary: "#d6ff3f", layoutStyle: "bleed" },
  },
  {
    title: "Soft Architectures",
    slug: "soft-architectures",
    description: "Rooms that refuse corners.",
    mediaUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    mediaType: "IMAGE",
    featured: false,
    viewCount: 1320,
    artistEmail: "kai@theartistpost.org",
    tagSlugs: ["3d", "abstract"],
    status: "PUBLISHED",
    theme: { primary: "#7dd3fc", layoutStyle: "framed" },
  },
  {
    title: "Archive Bloom",
    slug: "archive-bloom",
    description: "Torn paper memories reassembled into a garden.",
    mediaUrl:
      "https://images.unsplash.com/photo-1614850715649-1d0106293bd1?auto=format&fit=crop&w=1200&q=80",
    mediaType: "IMAGE",
    featured: false,
    viewCount: 980,
    artistEmail: "mira@theartistpost.org",
    tagSlugs: ["collage", "photography"],
    status: "PUBLISHED",
    theme: { primary: "#fb7185", layoutStyle: "stack" },
  },
  {
    title: "Orbit Studies",
    slug: "orbit-studies",
    description: "Small moons practicing patience.",
    mediaUrl:
      "https://images.unsplash.com/photo-1634017839464-5c339bbe3c8b?auto=format&fit=crop&w=1200&q=80",
    mediaType: "CANVAS",
    featured: false,
    viewCount: 2211,
    artistEmail: "luna@theartistpost.org",
    tagSlugs: ["3d", "motion"],
    status: "PUBLISHED",
    theme: { primary: "#d6ff3f", layoutStyle: "orbit" },
  },
  {
    title: "Signal Garden",
    slug: "signal-garden",
    description: "Broadcast flora growing through cracked glass.",
    mediaUrl:
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1200&q=80",
    mediaType: "IMAGE",
    featured: false,
    viewCount: 640,
    artistEmail: "kai@theartistpost.org",
    tagSlugs: ["neon", "abstract"],
    status: "PUBLISHED",
    theme: { layoutStyle: "bleed" },
  },
  {
    title: "Paper Tide",
    slug: "paper-tide",
    description: "Folded horizons that refuse to stay still.",
    mediaUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
    mediaType: "IMAGE",
    featured: false,
    viewCount: 512,
    artistEmail: "mira@theartistpost.org",
    tagSlugs: ["collage", "motion"],
    status: "PUBLISHED",
    theme: { layoutStyle: "framed" },
  },
];

async function main() {
  console.log("Seeding The Artist Post…");

  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.artistProfile.deleteMany();
  await prisma.user.deleteMany();

  for (const tag of tags) {
    await prisma.tag.create({ data: tag });
  }

  const userByEmail = new Map<string, string>();

  for (const artist of artists) {
    const user = await prisma.user.create({
      data: {
        email: artist.email,
        name: artist.name,
        image: artist.avatarUrl,
        role: "ARTIST",
        artistProfile: {
          create: {
            handle: artist.handle,
            bio: artist.bio,
            avatarUrl: artist.avatarUrl,
            socialLinks: artist.socialLinks,
          },
        },
      },
    });
    userByEmail.set(artist.email, user.id);
  }

  for (const post of posts) {
    const authorId = userByEmail.get(post.artistEmail);
    if (!authorId) continue;

    const created = await prisma.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        description: post.description,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        featured: post.featured,
        viewCount: post.viewCount,
        status: post.status,
        publishedAt: new Date(),
        theme: post.theme,
        authorId,
        tags: {
          connect: post.tagSlugs.map((slug) => ({ slug })),
        },
      },
    });

    // Seed a couple of likes from other artists
    for (const [email, id] of userByEmail) {
      if (email === post.artistEmail) continue;
      await prisma.like.create({
        data: { userId: id, postId: created.id },
      });
    }
  }

  const firstPost = await prisma.post.findFirst({
    where: { slug: "midnight-filament" },
  });
  const kai = await prisma.user.findUnique({
    where: { email: "kai@theartistpost.org" },
  });
  if (firstPost && kai) {
    await prisma.comment.create({
      data: {
        body: "The grain feels like breathing. Gorgeous restraint.",
        postId: firstPost.id,
        userId: kai.id,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
