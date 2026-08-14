PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`height_cm` real,
	`weight_kg` real,
	`goal` text,
	`notifications_enabled` integer DEFAULT false NOT NULL,
	`last_active_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_profiles`(`id`, `remote_id`, `height_cm`, `weight_kg`, `goal`, `notifications_enabled`, `last_active_at`, `created_at`, `updated_at`) SELECT `id`, NULL, `height_cm`, `weight_kg`, `goal`, `notifications_enabled`, `last_active_at`, `created_at`, current_timestamp FROM `profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_remote_id_unique` ON `profiles` (`remote_id`);--> statement-breakpoint
CREATE TABLE `__new_routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`name` text NOT NULL,
	`split_type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_routines`(`id`, `remote_id`, `name`, `split_type`, `is_active`, `created_at`, `updated_at`) SELECT `id`, NULL, `name`, `split_type`, `is_active`, `created_at`, current_timestamp FROM `routines`;--> statement-breakpoint
DROP TABLE `routines`;--> statement-breakpoint
ALTER TABLE `__new_routines` RENAME TO `routines`;--> statement-breakpoint
CREATE UNIQUE INDEX `routines_remote_id_unique` ON `routines` (`remote_id`);--> statement-breakpoint
CREATE TABLE `__new_routine_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`routine_id` integer NOT NULL,
	`label` text NOT NULL,
	`day_order` integer NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_routine_days`(`id`, `remote_id`, `routine_id`, `label`, `day_order`, `updated_at`) SELECT `id`, NULL, `routine_id`, `label`, `day_order`, current_timestamp FROM `routine_days`;--> statement-breakpoint
DROP TABLE `routine_days`;--> statement-breakpoint
ALTER TABLE `__new_routine_days` RENAME TO `routine_days`;--> statement-breakpoint
CREATE UNIQUE INDEX `routine_days_remote_id_unique` ON `routine_days` (`remote_id`);--> statement-breakpoint
CREATE TABLE `__new_routine_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`routine_day_id` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`target_weight_kg` real,
	`target_reps_min` integer,
	`target_reps_max` integer,
	`target_sets` integer DEFAULT 3 NOT NULL,
	`video_url` text,
	`notes` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_routine_exercises`(`id`, `remote_id`, `routine_day_id`, `exercise_id`, `order_index`, `target_weight_kg`, `target_reps_min`, `target_reps_max`, `target_sets`, `video_url`, `notes`, `updated_at`) SELECT `id`, NULL, `routine_day_id`, `exercise_id`, `order_index`, `target_weight_kg`, `target_reps_min`, `target_reps_max`, `target_sets`, `video_url`, `notes`, current_timestamp FROM `routine_exercises`;--> statement-breakpoint
DROP TABLE `routine_exercises`;--> statement-breakpoint
ALTER TABLE `__new_routine_exercises` RENAME TO `routine_exercises`;--> statement-breakpoint
CREATE UNIQUE INDEX `routine_exercises_remote_id_unique` ON `routine_exercises` (`remote_id`);--> statement-breakpoint
CREATE TABLE `__new_workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`routine_day_id` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`finished_at` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_days`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_workout_sessions`(`id`, `remote_id`, `routine_day_id`, `status`, `started_at`, `finished_at`, `updated_at`) SELECT `id`, NULL, `routine_day_id`, `status`, `started_at`, `finished_at`, current_timestamp FROM `workout_sessions`;--> statement-breakpoint
DROP TABLE `workout_sessions`;--> statement-breakpoint
ALTER TABLE `__new_workout_sessions` RENAME TO `workout_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `workout_sessions_remote_id_unique` ON `workout_sessions` (`remote_id`);--> statement-breakpoint
ALTER TABLE `set_logs` ADD `remote_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `set_logs_remote_id_unique` ON `set_logs` (`remote_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
