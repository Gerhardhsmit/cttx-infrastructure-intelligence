CREATE TABLE `audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`sector` enum('Game Reserve','Farm','Mining','Renewable Energy','Logistics','Other') NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`propertySizeHa` int,
	`operationalZones` json,
	`currentConnectivity` text,
	`knownProblems` json,
	`infrastructureNotes` text,
	`cisScore` int DEFAULT 0,
	`tciScore` int DEFAULT 0,
	`resilienceScore` int DEFAULT 0,
	`primaryArchitecture` text,
	`backupArchitecture` text,
	`engineeringNotes` text,
	`status` enum('Draft','Published') NOT NULL DEFAULT 'Draft',
	`leadEmail` varchar(320),
	`leadCompany` varchar(255),
	`leadBudget` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fieldObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`type` enum('Tower Sighting','Fibre Sighting','Signal Observation','Photo Note') NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`description` text,
	`photoUrl` text,
	`signalReadings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fieldObservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(255) NOT NULL,
	`budget` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
