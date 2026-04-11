ALTER TABLE `stages` ADD `type` text NOT NULL;--> statement-breakpoint
CREATE INDEX `stage_hackathon_idx` ON `stages` (`hackathon_id`);--> statement-breakpoint
ALTER TABLE `submissions` DROP COLUMN `type`;