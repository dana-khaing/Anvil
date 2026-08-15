CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
ALTER TABLE `routine_days` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `deleted_at` text;