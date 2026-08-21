import "dotenv/config";
import assert from "node:assert/strict";

import { prisma } from "../../src/lib/db";
import { listSlideshowProjects } from "../../src/lib/slideshow/list";
import { getSlideshowProject } from "../../src/lib/slideshow/service";

async function run() {
  const stamp = `${Date.now()}`;
  const projectId = `slides-list-${stamp}`;
  const extraId = `slides-list-extra-${stamp}`;

  try {
    await prisma.slideshowProject.create({
      data: {
        id: projectId,
        title: "List DTO fixture",
        status: "draft",
        settings: {
          aspectRatio: "9:16",
          successfulExportCount: 2,
          lastExportedAt: "2026-08-01T12:00:00.000Z",
        },
        layout: {},
        slides: {
          create: Array.from({ length: 5 }, (_, index) => ({
            position: index,
            kind: index === 0 ? "hook" : index === 4 ? "cta" : "content",
            imageUrl:
              index < 3 ? `/api/files/list-preview-${stamp}-${index}` : null,
            content: {
              headline: `Slide ${index + 1} body that must not appear in list`,
            },
            settings: {},
            layout: {},
          })),
        },
      },
    });
    await prisma.slideshowProject.create({
      data: {
        id: extraId,
        title: "Second list fixture",
        status: "ready",
        settings: {},
        layout: {},
      },
    });

    const listed = await listSlideshowProjects({ limit: 20, offset: 0 });
    const item = listed.projects.find((project) => project.id === projectId);
    assert.ok(item);
    assert.equal(item.slideCount, 5);
    assert.equal(
      Object.prototype.hasOwnProperty.call(item, "slides"),
      false,
    );
    assert.deepEqual(item.previewImageUrls, [
      `/api/files/list-preview-${stamp}-0`,
      `/api/files/list-preview-${stamp}-1`,
      `/api/files/list-preview-${stamp}-2`,
    ]);
    assert.equal(item.successfulExportCount, 2);
    assert.equal(JSON.stringify(item).includes("Slide 1 body"), false);

    const page = await listSlideshowProjects({ limit: 1, offset: 0 });
    assert.equal(page.projects.length, 1);
    assert.equal(page.limit, 1);
    assert.equal(page.offset, 0);
    assert.ok(page.total >= 2);

    const detail = await getSlideshowProject(projectId);
    assert.equal(detail.slides.length, 5);
    assert.equal(detail.slides[0]?.headline, "Slide 1 body that must not appear in list");
  } finally {
    await prisma.slideshowProject.deleteMany({
      where: { id: { in: [projectId, extraId] } },
    });
    await prisma.$disconnect();
  }
}

void run()
  .then(() => {
    console.log("slideshow list dto tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
