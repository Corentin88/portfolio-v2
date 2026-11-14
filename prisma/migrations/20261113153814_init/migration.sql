-- CreateTable
CREATE TABLE `project_categories` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_categories_name_key`(`name`),
    UNIQUE INDEX `project_categories_slug_key`(`slug`),
    INDEX `project_categories_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(30) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `summary` VARCHAR(400) NOT NULL,
    `context` VARCHAR(120) NULL,
    `badgeLabel` VARCHAR(40) NULL,
    `iconKey` VARCHAR(30) NOT NULL DEFAULT 'code',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `seoTitle` VARCHAR(70) NULL,
    `seoDescription` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `categoryId` VARCHAR(30) NOT NULL,
    `coverMediaId` VARCHAR(30) NULL,

    UNIQUE INDEX `projects_slug_key`(`slug`),
    INDEX `projects_status_position_idx`(`status`, `position`),
    INDEX `projects_categoryId_idx`(`categoryId`),
    INDEX `projects_coverMediaId_idx`(`coverMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_versions` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(20) NOT NULL,
    `label` VARCHAR(60) NOT NULL,
    `periodLabel` VARCHAR(80) NULL,
    `releasedAt` DATE NULL,
    `description` TEXT NOT NULL,
    `sourceUrl` VARCHAR(500) NULL,
    `demoUrl` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `projectId` VARCHAR(30) NOT NULL,
    `coverMediaId` VARCHAR(30) NULL,

    INDEX `project_versions_projectId_status_position_idx`(`projectId`, `status`, `position`),
    INDEX `project_versions_coverMediaId_idx`(`coverMediaId`),
    UNIQUE INDEX `project_versions_projectId_slug_key`(`projectId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `version_highlights` (
    `id` VARCHAR(30) NOT NULL,
    `kind` ENUM('FEATURE', 'IMPROVEMENT') NOT NULL,
    `text` VARCHAR(300) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `versionId` VARCHAR(30) NOT NULL,

    INDEX `version_highlights_versionId_kind_position_idx`(`versionId`, `kind`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `version_challenges` (
    `id` VARCHAR(30) NOT NULL,
    `problem` TEXT NOT NULL,
    `solution` TEXT NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `versionId` VARCHAR(30) NOT NULL,

    INDEX `version_challenges_versionId_position_idx`(`versionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technologies` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `showInSkills` BOOLEAN NOT NULL DEFAULT false,
    `skillPosition` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `skillCategoryId` VARCHAR(30) NULL,

    UNIQUE INDEX `technologies_name_key`(`name`),
    UNIQUE INDEX `technologies_slug_key`(`slug`),
    INDEX `technologies_skillCategoryId_showInSkills_skillPosition_idx`(`skillCategoryId`, `showInSkills`, `skillPosition`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `version_technologies` (
    `position` INTEGER NOT NULL DEFAULT 0,
    `versionId` VARCHAR(30) NOT NULL,
    `technologyId` VARCHAR(30) NOT NULL,

    INDEX `version_technologies_technologyId_idx`(`technologyId`),
    PRIMARY KEY (`versionId`, `technologyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skill_categories` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `skill_categories_name_key`(`name`),
    UNIQUE INDEX `skill_categories_slug_key`(`slug`),
    INDEX `skill_categories_isVisible_position_idx`(`isVisible`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skill_pillars` (
    `id` VARCHAR(30) NOT NULL,
    `title` VARCHAR(80) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `iconKey` VARCHAR(30) NOT NULL DEFAULT 'code',
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `skill_pillars_isVisible_position_idx`(`isVisible`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media` (
    `id` VARCHAR(30) NOT NULL,
    `kind` ENUM('IMAGE', 'DOCUMENT') NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER UNSIGNED NOT NULL,
    `width` INTEGER UNSIGNED NULL,
    `height` INTEGER UNSIGNED NULL,
    `alt` VARCHAR(300) NOT NULL DEFAULT '',
    `checksum` CHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `media_storageKey_key`(`storageKey`),
    INDEX `media_kind_createdAt_idx`(`kind`, `createdAt`),
    INDEX `media_checksum_idx`(`checksum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `version_screenshots` (
    `id` VARCHAR(30) NOT NULL,
    `alt` VARCHAR(300) NULL,
    `caption` VARCHAR(200) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `versionId` VARCHAR(30) NOT NULL,
    `mediaId` VARCHAR(30) NOT NULL,

    INDEX `version_screenshots_versionId_position_idx`(`versionId`, `position`),
    INDEX `version_screenshots_mediaId_idx`(`mediaId`),
    UNIQUE INDEX `version_screenshots_versionId_mediaId_key`(`versionId`, `mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timeline_entries` (
    `id` VARCHAR(30) NOT NULL,
    `periodLabel` VARCHAR(40) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NOT NULL,
    `iconKey` VARCHAR(30) NOT NULL DEFAULT 'code',
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `timeline_entries_isVisible_position_idx`(`isVisible`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `heroStatusLabel` VARCHAR(120) NOT NULL,
    `heroRoleLine` VARCHAR(160) NOT NULL,
    `heroTagline` VARCHAR(160) NOT NULL,
    `heroTaglineSub` VARCHAR(400) NOT NULL,
    `presentationTitle` VARCHAR(120) NOT NULL,
    `presentationBody` TEXT NOT NULL,
    `presentationQuote` VARCHAR(300) NULL,
    `contactEmail` VARCHAR(254) NOT NULL,
    `availabilityNote` VARCHAR(200) NULL,
    `linkedinUrl` VARCHAR(500) NULL,
    `githubUrl` VARCHAR(500) NULL,
    `seoTitle` VARCHAR(70) NOT NULL,
    `seoDescription` VARCHAR(160) NOT NULL,
    `ogImageMediaId` VARCHAR(30) NULL,
    `cvMediaId` VARCHAR(30) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `site_settings_ogImageMediaId_idx`(`ogImageMediaId`),
    INDEX `site_settings_cvMediaId_idx`(`cvMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_messages` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `subject` VARCHAR(150) NULL,
    `message` TEXT NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contact_messages_readAt_createdAt_idx`(`readAt`, `createdAt`),
    INDEX `contact_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `displayName` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `sessionVersion` INTEGER NOT NULL DEFAULT 0,
    `passwordChangedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `project_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_coverMediaId_fkey` FOREIGN KEY (`coverMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_versions` ADD CONSTRAINT `project_versions_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_versions` ADD CONSTRAINT `project_versions_coverMediaId_fkey` FOREIGN KEY (`coverMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `version_highlights` ADD CONSTRAINT `version_highlights_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `project_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `version_challenges` ADD CONSTRAINT `version_challenges_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `project_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technologies` ADD CONSTRAINT `technologies_skillCategoryId_fkey` FOREIGN KEY (`skillCategoryId`) REFERENCES `skill_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `version_technologies` ADD CONSTRAINT `version_technologies_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `project_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `version_technologies` ADD CONSTRAINT `version_technologies_technologyId_fkey` FOREIGN KEY (`technologyId`) REFERENCES `technologies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `version_screenshots` ADD CONSTRAINT `version_screenshots_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `project_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `version_screenshots` ADD CONSTRAINT `version_screenshots_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_ogImageMediaId_fkey` FOREIGN KEY (`ogImageMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_cvMediaId_fkey` FOREIGN KEY (`cvMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
