/**
 * Operator CLI: invite an approved artist (User + ArtistProfile).
 *
 * Usage:
 *   OPERATOR_SECRET=... DATABASE_URL=... pnpm invite:artist -- \
 *     --email real@example.com --handle realhandle --name "Real Name"
 *
 * Does not send email (no transactional provider yet). Does not invent defaults.
 * Never run prisma/seed.ts.
 */
import { PrismaClient } from "@prisma/client";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function usage(): never {
  console.error(
    [
      "Usage: pnpm invite:artist -- --email <email> --handle <handle> --name <name>",
      "Requires OPERATOR_SECRET and DATABASE_URL in the environment.",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  const secret = process.env.OPERATOR_SECRET;
  if (!secret) {
    console.error("OPERATOR_SECRET is not set.");
    process.exit(1);
  }

  const cliSecret = arg("--secret") ?? secret;
  if (cliSecret !== secret) {
    console.error("Operator secret rejected.");
    process.exit(1);
  }

  const email = arg("--email")?.trim().toLowerCase();
  const handle = arg("--handle")?.trim().toLowerCase();
  const name = arg("--name")?.trim();
  if (!email || !handle || !name) usage();

  const reserved = [
    "luna@theartistpost.org",
    "kai@theartistpost.org",
    "mira@theartistpost.org",
    "guest@theartistpost.org",
  ];
  if (reserved.includes(email!) || handle === "studioguest") {
    console.error("That identity is reserved and cannot be invited.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({
      where: { email: email! },
      include: { artistProfile: true },
    });

    if (existing?.artistProfile) {
      const profile = await prisma.artistProfile.update({
        where: { id: existing.artistProfile.id },
        data: { approved: true, handle: handle! },
      });
      await prisma.user.update({
        where: { id: existing.id },
        data: { name: name!, role: "ARTIST" },
      });
      await prisma.auditLog.create({
        data: {
          action: "artist.approve",
          targetType: "ArtistProfile",
          targetId: profile.id,
          meta: { email, handle, via: "invite-artist.ts", reapprove: true },
        },
      });
      console.log(`Approved existing artist ${handle} (${email})`);
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: email!,
        name: name!,
        role: "ARTIST",
        artistProfile: {
          create: { handle: handle!, approved: true },
        },
      },
      include: { artistProfile: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "artist.invite",
        targetType: "ArtistProfile",
        targetId: user.artistProfile!.id,
        meta: { email, handle, via: "invite-artist.ts" },
      },
    });

    console.log(`Invited approved artist ${handle} (${email}) — user ${user.id}`);
    console.log(
      "Passwordless / magic-link delivery is not wired yet; document sign-in when NextAuth lands.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
