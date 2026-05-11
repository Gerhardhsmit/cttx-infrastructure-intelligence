ALTER TABLE `operationalCriticalLocations` ADD `reserveSiteType` varchar(64);--> statement-breakpoint
ALTER TABLE `operationalCriticalLocations` ADD `topologyRole` text;--> statement-breakpoint
ALTER TABLE `operationalCriticalLocations` ADD `businessDrivers` json;--> statement-breakpoint
ALTER TABLE `operationalPainPoints` ADD `businessDrivers` json;