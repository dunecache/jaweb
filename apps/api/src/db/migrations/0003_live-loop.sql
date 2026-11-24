CREATE TABLE `participations` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`student_id` text NOT NULL,
	`started_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participations_exercise_student_idx` ON `participations` (`exercise_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`question_id` text NOT NULL,
	`student_id` text NOT NULL,
	`answer` text,
	`submitted_at` text NOT NULL,
	`status` text DEFAULT 'grading' NOT NULL,
	`score` real,
	`verdict` text,
	`feedback` text,
	`graded_by` text,
	`graded_at` text,
	`flagged` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_question_student_idx` ON `submissions` (`question_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `submissions_exercise_idx` ON `submissions` (`exercise_id`);