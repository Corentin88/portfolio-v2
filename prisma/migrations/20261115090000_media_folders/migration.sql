-- Médiathèque V2 : dossiers virtuels. Ajouts uniquement : nouvelle table et
-- colonne nullable `media.folderId`. Aucun fichier ni aucune ligne existante
-- n'est modifié ; les médias actuels restent « Non classés » (folderId NULL)
-- avec le même identifiant, la même URL et les mêmes associations.

-- AlterTable
ALTER TABLE `media` ADD COLUMN `folderId` VARCHAR(30) NULL;

-- CreateTable
CREATE TABLE `media_folders` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `parentId` VARCHAR(30) NULL,

    UNIQUE INDEX `media_folders_parentId_name_key`(`parentId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `media_folderId_createdAt_idx` ON `media`(`folderId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `media_folders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_folders` ADD CONSTRAINT `media_folders_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `media_folders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

