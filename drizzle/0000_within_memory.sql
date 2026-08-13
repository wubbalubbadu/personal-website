CREATE TABLE `messages` (
  `id` text PRIMARY KEY NOT NULL,
  `user_text` text NOT NULL,
  `assistant_text` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposals` (
  `id` text PRIMARY KEY NOT NULL,
  `message_id` text NOT NULL,
  `category` text NOT NULL,
  `title` text NOT NULL,
  `details` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_status_created` ON `proposals` (`status`,`created_at`);
