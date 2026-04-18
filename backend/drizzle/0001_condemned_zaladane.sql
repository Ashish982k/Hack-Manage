CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`team_id` text NOT NULL,
	`rank` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `results_hackathon_stage_team_unique` ON `results` (`hackathon_id`,`stage_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `results_hackathon_stage_rank_unique` ON `results` (`hackathon_id`,`stage_id`,`rank`);--> statement-breakpoint
CREATE INDEX `results_hackathon_idx` ON `results` (`hackathon_id`);