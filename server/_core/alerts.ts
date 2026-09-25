import nodemailer from "nodemailer";
import cron from "node-cron";

/**
 * CTTX Alert System
 * Sends aggressive email notifications to drive project outcomes
 * - Daily Standup (08:00 SAST, weekdays)
 * - Budget Alerts (costs > 80% of contract)
 * - Deadline Warnings (phase overdue)
 * - Client Follow-up Reminders (7+ days no contact)
 */

const RECIPIENT_EMAIL = process.env.ALERT_EMAIL || "gerhardcttx@gmail.com";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || process.env.ALERT_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || "";

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

interface ProjectAlert {
  projectCode: string;
  clientName: string;
  issue: string;
  action: string;
  severity: "info" | "warning" | "critical";
}

/**
 * Alert 1: Daily Standup (08:00 SAST / 06:00 UTC, weekdays)
 * Shows: What's due today, overdue phases, quick links
 */
async function sendDailyStandup() {
  const now = new Date();
  const subject = `🚀 CTTX Daily Standup - ${now.toLocaleDateString("en-ZA")}`;

  const body = `
Good morning Brandon,

Here's your CTTX Solution Architect daily checklist:

📋 TODAY'S FOCUS:
1. Check Notion → Active Projects view
2. Complete assigned tasks for current phase
3. Export Link Planner designs if in Phase 2
4. Log costs if new quotes received

🎯 QUICK LINKS:
• Clients DB: https://app.notion.com/p/4547a667409a4d46a0e20409442f3f5f
• Cost Forms: https://app.notion.com/p/7d1d564dd7374647afc867394cf3206a
• Link Planner: http://localhost:5000/link-planner

⚠️ CHECK THESE TODAY:
• Any projects behind Phase schedule?
• Any projects > 80% budget spent?
• Any clients with no contact in 7 days?

---
Automated by CTTX Alert System
`;

  await sendEmail(subject, body);
}

/**
 * Alert 2: Budget Alert
 * Trigger: When project costs exceed 80% of contract value
 */
async function checkBudgetAlerts(projects: any[]) {
  const alerts: ProjectAlert[] = [];

  for (const project of projects) {
    if (!project.contractValue || project.contractValue === 0) continue;

    const spent = project.costsForms?.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0) || 0;
    const percentSpent = (spent / project.contractValue) * 100;

    if (percentSpent > 80) {
      alerts.push({
        projectCode: project.projectCode,
        clientName: project.clientName,
        issue: `Budget ${percentSpent.toFixed(0)}% spent (R${spent.toLocaleString()} of R${project.contractValue.toLocaleString()})`,
        action: "Review remaining scope and supplier quotes",
        severity: percentSpent > 95 ? "critical" : "warning",
      });
    }
  }

  if (alerts.length > 0) {
    await sendBudgetAlert(alerts);
  }
}

/**
 * Alert 3: Deadline Warning
 * Trigger: When phase deadline has passed but phase is not complete
 */
async function checkDeadlineWarnings(projects: any[]) {
  const alerts: ProjectAlert[] = [];
  const now = new Date();

  const phaseDueDates: Record<string, number> = {
    "Phase 1": 3,  // 3 days
    "Phase 2": 7,  // 7 days
    "Phase 3": 10, // 10 days
    "Phase 4": 14, // 14 days
    "Phase 5": 21, // 21 days
  };

  for (const project of projects) {
    if (!project.startDate || project.status === "Completed" || project.status === "Planning") continue;

    const startDate = new Date(project.startDate);
    const currentPhase = project.currentPhase || "Phase 1";
    const phaseDays = phaseDueDates[currentPhase] || 7;
    const dueDate = new Date(startDate.getTime() + phaseDays * 24 * 60 * 60 * 1000);

    if (now > dueDate && project.status !== "Completed") {
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));

      alerts.push({
        projectCode: project.projectCode,
        clientName: project.clientName,
        issue: `${currentPhase} overdue by ${daysOverdue} days (due ${dueDate.toLocaleDateString("en-ZA")})`,
        action: `Complete ${currentPhase} tasks and move to next phase`,
        severity: daysOverdue > 7 ? "critical" : "warning",
      });
    }
  }

  if (alerts.length > 0) {
    await sendDeadlineWarning(alerts);
  }
}

/**
 * Alert 4: Client Follow-up Reminder
 * Trigger: No contact from client in 7+ days
 */
async function checkClientFollowups(projects: any[]) {
  const alerts: ProjectAlert[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const project of projects) {
    if (!project.lastClientContact || project.status === "Completed") continue;

    const lastContact = new Date(project.lastClientContact);

    if (lastContact < sevenDaysAgo) {
      const daysNoContact = Math.floor((now.getTime() - lastContact.getTime()) / (24 * 60 * 60 * 1000));

      alerts.push({
        projectCode: project.projectCode,
        clientName: project.clientName,
        issue: `No client contact for ${daysNoContact} days (last: ${lastContact.toLocaleDateString("en-ZA")})`,
        action: "Send status update or schedule call with client",
        severity: daysNoContact > 14 ? "critical" : "warning",
      });
    }
  }

  if (alerts.length > 0) {
    await sendFollowupReminder(alerts);
  }
}

/**
 * Send budget alert email
 */
async function sendBudgetAlert(alerts: ProjectAlert[]) {
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  const subject = `💰 CTTX Budget Alert${criticalAlerts.length > 0 ? " (CRITICAL)" : ""}`;

  const body = `
Budget Alert Report

${
  criticalAlerts.length > 0
    ? `⚠️ CRITICAL (>95% spent):
${criticalAlerts.map((a) => `  • ${a.clientName} (${a.projectCode}): ${a.issue}`).join("\n")}

`
    : ""
}
${
  warningAlerts.length > 0
    ? `⚠️ WARNING (80-95% spent):
${warningAlerts.map((a) => `  • ${a.clientName} (${a.projectCode}): ${a.issue}`).join("\n")}

`
    : ""
}
ACTION REQUIRED:
${alerts.map((a) => `• ${a.projectCode}: ${a.action}`).join("\n")}

Review all costs and supplier quotes in Cost Forms database.

---
Automated by CTTX Alert System
`;

  await sendEmail(subject, body);
}

/**
 * Send deadline warning email
 */
async function sendDeadlineWarning(alerts: ProjectAlert[]) {
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  const subject = `⏰ CTTX Deadline Alert${criticalAlerts.length > 0 ? " (CRITICAL)" : ""}`;

  const body = `
Deadline Warning Report

${
  criticalAlerts.length > 0
    ? `🔴 CRITICAL (>7 days overdue):
${criticalAlerts.map((a) => `  • ${a.clientName} (${a.projectCode}): ${a.issue}`).join("\n")}

`
    : ""
}
${
  warningAlerts.length > 0
    ? `🟡 WARNING (1-7 days overdue):
${warningAlerts.map((a) => `  • ${a.clientName} (${a.projectCode}): ${a.issue}`).join("\n")}

`
    : ""
}
ACTION REQUIRED:
${alerts.map((a) => `• ${a.projectCode}: ${a.action}`).join("\n")}

Update phase completion status in Notion to move to next phase.

---
Automated by CTTX Alert System
`;

  await sendEmail(subject, body);
}

/**
 * Send client follow-up reminder email
 */
async function sendFollowupReminder(alerts: ProjectAlert[]) {
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  const subject = `📞 CTTX Client Follow-up Reminder${criticalAlerts.length > 0 ? " (CRITICAL)" : ""}`;

  const body = `
Client Contact Reminder

${
  criticalAlerts.length > 0
    ? `🔴 CRITICAL (>14 days no contact):
${criticalAlerts.map((a) => `  • ${a.clientName} (${a.projectCode}): ${a.issue}`).join("\n")}

`
    : ""
}
${
  warningAlerts.length > 0
    ? `🟡 WARNING (7-14 days no contact):
${warningAlerts.map((a) => `  • ${a.clientName} (${a.projectCode}): ${a.issue}`).join("\n")}

`
    : ""
}
ACTION REQUIRED:
${alerts.map((a) => `• ${a.projectCode}: ${a.action}`).join("\n")}

Update "Last Client Contact" date in Notion after reaching out.

---
Automated by CTTX Alert System
`;

  await sendEmail(subject, body);
}

/**
 * Generic email sender
 */
async function sendEmail(subject: string, body: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️ Email not configured. Set SMTP_USER and SMTP_PASS environment variables.");
    console.log(`\n📧 [EMAIL] ${subject}\n${body}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: RECIPIENT_EMAIL,
      subject,
      text: body,
      html: `<pre>${body}</pre>`,
    });

    console.log(`✅ Email sent: ${subject}`);
  } catch (error) {
    console.error(`❌ Failed to send email: ${subject}`, error);
  }
}

/**
 * Initialize alert scheduler
 * Runs on server startup
 */
export function initializeAlerts() {
  // Daily standup: 08:00 SAST (06:00 UTC) on weekdays
  cron.schedule("0 6 * * 1-5", () => {
    console.log("🔔 Running daily standup alert...");
    sendDailyStandup().catch(console.error);
  });

  // Check budget every 12 hours
  cron.schedule("0 */12 * * *", () => {
    console.log("🔔 Checking budget alerts...");
    // Note: In production, fetch actual projects from database
    // checkBudgetAlerts(projects).catch(console.error);
  });

  // Check deadlines every 6 hours
  cron.schedule("0 */6 * * *", () => {
    console.log("🔔 Checking deadline warnings...");
    // checkDeadlineWarnings(projects).catch(console.error);
  });

  // Check client follow-ups daily
  cron.schedule("0 9 * * *", () => {
    console.log("🔔 Checking client follow-ups...");
    // checkClientFollowups(projects).catch(console.error);
  });

  console.log("✅ Alert system initialized");
  console.log(`📧 Alerts will be sent to: ${RECIPIENT_EMAIL}`);
}

export { sendEmail, checkBudgetAlerts, checkDeadlineWarnings, checkClientFollowups };
