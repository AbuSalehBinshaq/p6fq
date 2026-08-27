CREATE TABLE `conversationOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(24) NOT NULL,
	`childName` varchar(80) NOT NULL,
	`childAge` int NOT NULL,
	`childInterest` varchar(180) NOT NULL,
	`contactMethod` enum('telegram','whatsapp','phone') NOT NULL,
	`contactValue` varchar(120) NOT NULL,
	`privacyConsent` boolean NOT NULL DEFAULT false,
	`status` enum('conversation_started','awaiting_photo','preview_in_progress','preview_shared','awaiting_approval','approved_for_payment','paid','delivered','cancelled') NOT NULL DEFAULT 'conversation_started',
	`ownerNotifiedAt` timestamp,
	`telegramOpenedAt` timestamp,
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversationOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversationOrders_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','user') NOT NULL DEFAULT 'user';