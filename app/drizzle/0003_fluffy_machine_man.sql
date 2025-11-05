ALTER TABLE `routine_days` ADD `muscle_groups` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `counts_toward_streak` integer DEFAULT true NOT NULL;