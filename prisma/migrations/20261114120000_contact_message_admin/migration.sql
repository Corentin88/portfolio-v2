-- Messagerie de l'administration : statut « traité », suivi de la notification
-- Resend et clé d'idempotence du formulaire. Colonnes nullables : aucune donnée
-- existante n'est modifiée.

-- AlterTable
ALTER TABLE `contact_messages` ADD COLUMN `handledAt` DATETIME(3) NULL,
    ADD COLUMN `notifiedAt` DATETIME(3) NULL,
    ADD COLUMN `submissionId` VARCHAR(36) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `contact_messages_submissionId_key` ON `contact_messages`(`submissionId`);

-- CreateIndex
CREATE INDEX `contact_messages_handledAt_createdAt_idx` ON `contact_messages`(`handledAt`, `createdAt`);
