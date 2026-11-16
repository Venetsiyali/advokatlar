-- CreateTable
CREATE TABLE "StaticPage" (
    "slug" TEXT NOT NULL,
    "titleUz" TEXT NOT NULL,
    "titleUzCyrl" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "contentUz" TEXT NOT NULL,
    "contentUzCyrl" TEXT NOT NULL,
    "contentRu" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("slug")
);
