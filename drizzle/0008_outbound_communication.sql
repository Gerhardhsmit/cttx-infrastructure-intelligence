-- CTTX Persistent Outbound Communication Infrastructure
-- Migration: 0008_outbound_communication
-- Created: 2026-09-27

CREATE TABLE IF NOT EXISTS `outboundMessages` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `messageId` varchar(64) NOT NULL UNIQUE,
  `prospectId` varchar(255),
  `accountId` varchar(255),
  `pipelineId` varchar(255),
  `messageType` varchar(64) NOT NULL,
  `campaignName` varchar(255),
  `recipient` varchar(320) NOT NULL,
  `recipientName` varchar(255),
  `subject` varchar(255) NOT NULL,
  `body` LONGTEXT,
  `bodyType` enum('html', 'text') DEFAULT 'html',
  `attachments` JSON,
  `status` enum(
    'DRAFT', 'READY', 'APPROVED', 'QUEUED', 'SENDING', 'SENT', 'VERIFIED',
    'FOLLOW_UP_DUE', 'RESPONDED', 'CLOSED',
    'RETRY', 'BLOCKED', 'FAILED', 'DEAD_LETTER'
  ) DEFAULT 'DRAFT' NOT NULL,
  `approvedBy` varchar(255),
  `approvedAt` timestamp NULL,
  `transport` varchar(64),
  `providerMessageId` varchar(512),
  `attemptCount` int DEFAULT 0,
  `lastAttemptAt` timestamp NULL,
  `lastError` LONGTEXT,
  `nextRetryAt` timestamp NULL,
  `sentAt` timestamp NULL,
  `verifiedAt` timestamp NULL,
  `verificationMethod` varchar(64),
  `followUpDueAt` timestamp NULL,
  `source` varchar(255) DEFAULT 'assessment_engine',
  `metadata` JSON,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_status` (`status`),
  KEY `idx_transport` (`transport`),
  KEY `idx_prospectId` (`prospectId`),
  KEY `idx_accountId` (`accountId`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `outboundMessageAttempts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `messageId` int NOT NULL,
  `attemptNumber` int NOT NULL,
  `status` varchar(64) NOT NULL,
  `transport` varchar(64) NOT NULL,
  `providerResponse` JSON,
  `error` LONGTEXT,
  `errorCode` varchar(64),
  `nextRetryAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`messageId`) REFERENCES `outboundMessages` (`id`) ON DELETE CASCADE,
  KEY `idx_messageId` (`messageId`),
  KEY `idx_status` (`status`),
  KEY `idx_errorCode` (`errorCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `outboundReceipts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `messageId` int NOT NULL,
  `recipient` varchar(320) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `transport` varchar(64) NOT NULL,
  `providerMessageId` varchar(512),
  `sentTimestamp` timestamp NULL,
  `verifiedTimestamp` timestamp NULL,
  `verificationMethod` varchar(64),
  `verification` JSON,
  `pipelineUpdatedAt` timestamp NULL,
  `followUpCreatedAt` timestamp NULL,
  `notes` LONGTEXT,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`messageId`) REFERENCES `outboundMessages` (`id`) ON DELETE CASCADE,
  KEY `idx_messageId` (`messageId`),
  KEY `idx_transport` (`transport`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `deadLetterMessages` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `messageId` int,
  `originalMessageId` varchar(64),
  `prospectId` varchar(255),
  `recipient` varchar(320),
  `subject` varchar(255),
  `failureReason` LONGTEXT,
  `failureClassification` varchar(64),
  `attemptCount` int,
  `lastError` LONGTEXT,
  `recommendedAction` LONGTEXT,
  `resolvedBy` varchar(255),
  `resolvedAt` timestamp NULL,
  `resolution` varchar(255),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`messageId`) REFERENCES `outboundMessages` (`id`) ON DELETE SET NULL,
  KEY `idx_prospectId` (`prospectId`),
  KEY `idx_failureClassification` (`failureClassification`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
