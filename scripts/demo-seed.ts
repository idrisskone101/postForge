import "dotenv/config";

/**
 * Restore the demo workspace by hand: `pnpm demo:seed`.
 *
 * A running demo build does this itself at boot and on a timer. The script is
 * for local work on the sample set. It forces demo mode for this process and
 * relies on the same guard as the server, so it refuses any database that
 * holds content the demo did not create.
 */
process.env.NEXT_PUBLIC_POSTFORGE_DEMO_MODE = "1";

async function main() {
  const { restoreDemoWorkspace } = await import("../src/lib/demo/restore");
  const { prisma } = await import("../src/lib/db");
  try {
    await restoreDemoWorkspace();
    const [jobs, files, avatars, projects] = await Promise.all([
      prisma.generationJob.count(),
      prisma.generatedFile.count(),
      prisma.avatar.count(),
      prisma.slideshowProject.count(),
    ]);
    console.log(
      `Demo workspace restored: ${jobs} jobs, ${files} outputs, ${avatars} avatars, ${projects} slideshows.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
