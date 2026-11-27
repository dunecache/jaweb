CREATE TABLE `provider_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`api_key_ciphertext` text,
	`api_key_last4` text,
	`base_url` text,
	`tested_at` text,
	`test_ok` integer,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
DROP INDEX `submissions_question_student_idx`;--> statement-breakpoint
ALTER TABLE `submissions` ADD `points` integer;--> statement-breakpoint
ALTER TABLE `submissions` ADD `archived_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_question_student_idx` ON `submissions` (`question_id`,`student_id`) WHERE archived_at IS NULL;