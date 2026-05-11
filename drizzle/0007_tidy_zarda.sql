CREATE TABLE `linkPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int,
	`planName` varchar(255) NOT NULL,
	`propertyName` varchar(255) NOT NULL,
	`centerLatitude` decimal(10,8),
	`centerLongitude` decimal(11,8),
	`propertyAreaHa` int,
	`selectedMastId` varchar(128),
	`boundary` json,
	`highSites` json,
	`providerMasts` json,
	`links` json,
	`assumptions` json,
	`recommendationSummary` text,
	`totalDistanceKm` decimal(8,2),
	`liveDistanceKm` decimal(8,2),
	`status` enum('Draft','Ready for Field Validation') NOT NULL DEFAULT 'Draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `linkPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operationalCriticalLocations` MODIFY COLUMN `locationType` enum('Lodge','Ranger Station','Gate','Security Post','Control Room','Staff Village','Workshop','Water/Pump Site','CCTV/Sensor Zone','Camera Site','Fence Line','Anti-Poaching Point','Solar System','Fuel Depot','Hunting Camp','Airstrip','River Crossing','Repeater Point','Other') NOT NULL;--> statement-breakpoint
ALTER TABLE `operationalCriticalLocations` MODIFY COLUMN `priority` enum('Critical','Important','Nice-to-Have','High','Medium','Low') NOT NULL DEFAULT 'Important';--> statement-breakpoint
ALTER TABLE `operationalPainPoints` MODIFY COLUMN `category` enum('Coverage Gap','Unstable Link','Security Blind Spot','Power Dependency','Operational Delay','Guest Experience','Camera Outage','Communication Delay','Payment Failure','Staff Disconnection','Response Delay','Radio Unreliability','Remote Visibility Gap','Other') NOT NULL;--> statement-breakpoint
ALTER TABLE `operationalPainPoints` MODIFY COLUMN `severity` enum('Critical','Important','Nice-to-Have','High','Medium','Low') NOT NULL DEFAULT 'Important';--> statement-breakpoint
ALTER TABLE `audits` ADD `operationalFrustrationScore` int;--> statement-breakpoint
ALTER TABLE `audits` ADD `applicationProfile` json;--> statement-breakpoint
ALTER TABLE `audits` ADD `projectedUptimePercent` decimal(5,2);--> statement-breakpoint
ALTER TABLE `audits` ADD `uptimeModel` json;--> statement-breakpoint
ALTER TABLE `audits` ADD `targetBer` varchar(32);--> statement-breakpoint
ALTER TABLE `audits` ADD `payloadThroughputMbps` int;--> statement-breakpoint
ALTER TABLE `audits` ADD `linkQuality` text;--> statement-breakpoint
ALTER TABLE `audits` ADD `productStack` json;--> statement-breakpoint
ALTER TABLE `audits` ADD `remoteMonitoringFlag` text;