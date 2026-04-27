DROP TABLE `certificates`;--> statement-breakpoint
DROP TABLE `qr_scans`;--> statement-breakpoint
DROP TABLE `results`;--> statement-breakpoint
DROP TABLE `user_verifications`;--> statement-breakpoint
CREATE UNIQUE INDEX `shortlisted_team_stage_unique` ON `shortlisted_teams` (`team_id`,`stage_id`);