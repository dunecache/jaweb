CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verdict_visibility` text NOT NULL,
	`opens_at` text,
	`closes_at` text,
	`speed_window_seconds` integer DEFAULT 120 NOT NULL,
	`weight_correct` real DEFAULT 0.75 NOT NULL,
	`weight_speed` real DEFAULT 0.25 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercises_module_idx` ON `exercises` (`module_id`);--> statement-breakpoint
CREATE INDEX `exercises_class_status_idx` ON `exercises` (`class_id`,`status`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `modules_position_idx` ON `modules` (`position`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`prompt` text NOT NULL,
	`kind` text NOT NULL,
	`options` text,
	`correct_option_ids` text,
	`model_answer` text,
	`key_points` text,
	`aliases` text,
	`points` integer DEFAULT 10 NOT NULL,
	`partial_credit` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_exercise_idx` ON `questions` (`exercise_id`,`position`);