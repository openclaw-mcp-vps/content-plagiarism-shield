import {
  listAllMonitoredContent,
  listScanResultsByOwner,
  updateContentLastScan,
  upsertScanResults
} from "../lib/database";
import { scanForPlagiarism } from "../lib/plagiarism-scanner";
import { sendPlagiarismAlert } from "../lib/email";
import { CronJob } from "cron";

async function scanOnce() {
  const startedAt = new Date().toISOString();
  console.log(`[scan-content] Started at ${startedAt}`);

  const contentItems = await listAllMonitoredContent();

  for (const content of contentItems) {
    const matches = await scanForPlagiarism(content.sourceUrl, content.title);
    await upsertScanResults(content.id, matches);
    await updateContentLastScan(content.id, new Date().toISOString());

    if (matches.length > 0) {
      const latestOwnerResults = await listScanResultsByOwner(content.ownerEmail);

      await sendPlagiarismAlert({
        to: content.ownerEmail,
        contentTitle: content.title,
        dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:3000/dashboard",
        findings: latestOwnerResults
          .filter((item) => item.contentId === content.id)
          .slice(0, 5)
          .map((item) => ({
            infringingUrl: item.infringingUrl,
            confidence: item.confidence
          }))
      });
    }
  }

  console.log(`[scan-content] Completed at ${new Date().toISOString()}`);
}

const schedule = process.env.SCAN_CRON_SCHEDULE ?? "0 */6 * * *";
const job = new CronJob(schedule, () => {
  void scanOnce();
});

void scanOnce();
job.start();
console.log(`[scan-content] Scheduler started with cron: ${schedule}`);
