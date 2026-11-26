CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "trips_name_length" CHECK(length("trips"."name") BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE INDEX `trips_owner_created` ON `trips` (`owner_id`,`created_at`);