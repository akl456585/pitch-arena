CREATE TABLE `ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`category` text NOT NULL,
	`logo_emoji` text NOT NULL,
	`problem` text NOT NULL,
	`solution` text NOT NULL,
	`target_market` text NOT NULL,
	`tam` text NOT NULL,
	`business_model` text NOT NULL,
	`pricing` text NOT NULL,
	`competitors` text NOT NULL,
	`go_to_market` text NOT NULL,
	`financials` text NOT NULL,
	`risks` text NOT NULL,
	`tech_stack` text NOT NULL,
	`overall_score` real DEFAULT 0,
	`valuation` real DEFAULT 1000,
	`total_invested` real DEFAULT 0,
	`status` text DEFAULT 'active',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`idea_id` integer NOT NULL,
	`amount` real NOT NULL,
	`price_at_investment` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `judgements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`idea_id` integer NOT NULL,
	`judge_name` text NOT NULL,
	`judge_persona` text NOT NULL,
	`innovation` integer NOT NULL,
	`feasibility` integer NOT NULL,
	`market_fit` integer NOT NULL,
	`scalability` integer NOT NULL,
	`x_factor` integer NOT NULL,
	`verdict` text NOT NULL,
	`invest_or_pass` text NOT NULL,
	`rebuttals` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `market_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`idea_id` integer NOT NULL,
	`event_text` text NOT NULL,
	`impact_percent` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`avatar` text,
	`balance` real DEFAULT 10000,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);