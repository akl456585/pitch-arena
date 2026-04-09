CREATE TABLE `ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`tagline` varchar(500) NOT NULL,
	`category` varchar(100) NOT NULL,
	`logo_emoji` varchar(10) NOT NULL,
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
	`overall_score` double DEFAULT 0,
	`valuation` double DEFAULT 1000,
	`total_invested` double DEFAULT 0,
	`status` varchar(20) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ideas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`idea_id` int NOT NULL,
	`amount` double NOT NULL,
	`price_at_investment` double NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `investments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `judgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idea_id` int NOT NULL,
	`judge_name` varchar(100) NOT NULL,
	`judge_persona` varchar(255) NOT NULL,
	`innovation` int NOT NULL,
	`feasibility` int NOT NULL,
	`market_fit` int NOT NULL,
	`scalability` int NOT NULL,
	`x_factor` int NOT NULL,
	`verdict` text NOT NULL,
	`invest_or_pass` varchar(10) NOT NULL,
	`rebuttals` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `judgements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idea_id` int NOT NULL,
	`event_text` text NOT NULL,
	`impact_percent` double NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `market_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`avatar` varchar(255),
	`balance` double DEFAULT 10000,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `investments` ADD CONSTRAINT `investments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investments` ADD CONSTRAINT `investments_idea_id_ideas_id_fk` FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `judgements` ADD CONSTRAINT `judgements_idea_id_ideas_id_fk` FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_events` ADD CONSTRAINT `market_events_idea_id_ideas_id_fk` FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON DELETE no action ON UPDATE no action;