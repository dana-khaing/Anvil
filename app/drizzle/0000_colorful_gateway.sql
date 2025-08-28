CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`equipment` text NOT NULL,
	`muscle_group` text NOT NULL,
	`default_video_url` text,
	`alternative_ids` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period` text NOT NULL,
	`target_count` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`height_cm` real,
	`weight_kg` real,
	`goal` text,
	`notifications_enabled` integer DEFAULT false NOT NULL,
	`last_active_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`label` text NOT NULL,
	`day_order` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_day_id` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`target_weight_kg` real,
	`target_reps_min` integer,
	`target_reps_max` integer,
	`target_sets` integer DEFAULT 3 NOT NULL,
	`video_url` text,
	`notes` text,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`split_type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `set_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`routine_exercise_id` integer NOT NULL,
	`substituted_exercise_id` text,
	`set_number` integer NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`completed_at` text DEFAULT (current_timestamp),
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`substituted_exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_workout_date` text
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_day_id` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_days`(`id`) ON UPDATE no action ON DELETE no action
);
