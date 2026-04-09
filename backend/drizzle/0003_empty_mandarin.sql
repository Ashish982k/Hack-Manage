CREATE TABLE `hackathonRoles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`hackathon_id` text NOT NULL,
	`role` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathonRoles_id_unique` ON `hackathonRoles` (`id`);