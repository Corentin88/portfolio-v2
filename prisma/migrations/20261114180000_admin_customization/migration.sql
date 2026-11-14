-- Personnalisation depuis l'administration : photo de la carte de visite,
-- illustration des étapes de timeline, logo et couleur du badge des projets.
-- Ajouts uniquement : colonnes nullables (ou avec valeur par défaut), aucune
-- donnée existante n'est modifiée. Les badges existants gardent l'ambre (« warning »).

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `badgeTone` VARCHAR(10) NOT NULL DEFAULT 'warning',
    ADD COLUMN `iconMediaId` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `timeline_entries` ADD COLUMN `imageMediaId` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `site_settings` ADD COLUMN `profilePhotoMediaId` VARCHAR(30) NULL;

-- CreateIndex
CREATE INDEX `projects_iconMediaId_idx` ON `projects`(`iconMediaId`);

-- CreateIndex
CREATE INDEX `timeline_entries_imageMediaId_idx` ON `timeline_entries`(`imageMediaId`);

-- CreateIndex
CREATE INDEX `site_settings_profilePhotoMediaId_idx` ON `site_settings`(`profilePhotoMediaId`);

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_iconMediaId_fkey` FOREIGN KEY (`iconMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_entries` ADD CONSTRAINT `timeline_entries_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_profilePhotoMediaId_fkey` FOREIGN KEY (`profilePhotoMediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
