CREATE TABLE IF NOT EXISTS `infrastructureAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalRef` varchar(128) NOT NULL,
	`label` varchar(255) NOT NULL,
	`assetType` enum('Tower','Fibre Route','PoP') NOT NULL,
	`provider` varchar(255),
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`endLatitude` decimal(10,8),
	`endLongitude` decimal(11,8),
	`description` text,
	`confidence` int NOT NULL DEFAULT 60,
	`verificationStatus` enum('Known','Candidate','Field Verified') NOT NULL DEFAULT 'Candidate',
	`region` varchar(255),
	`source` varchar(255) NOT NULL DEFAULT 'CTTX infrastructure intelligence',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `infrastructureAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `infrastructureAssets_externalRef_unique` UNIQUE(`externalRef`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `operationalCriticalLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`locationType` enum('Lodge','Gate','Security Post','Control Room','Staff Village','Workshop','Water/Pump Site','CCTV/Sensor Zone','Fence Line','Anti-Poaching Point','Other') NOT NULL,
	`priority` enum('Critical','High','Medium','Low') NOT NULL DEFAULT 'High',
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`connectivityRequirement` text,
	`businessImpact` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationalCriticalLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `operationalPainPoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` enum('Coverage Gap','Unstable Link','Security Blind Spot','Power Dependency','Operational Delay','Guest Experience','Other') NOT NULL,
	`severity` enum('Critical','High','Medium','Low') NOT NULL DEFAULT 'High',
	`affectedLocation` varchar(255),
	`description` text,
	`businessImpact` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationalPainPoints_id` PRIMARY KEY(`id`)
);
