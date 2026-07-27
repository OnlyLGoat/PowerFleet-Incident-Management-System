import { SlaService } from "@/lib/services/sla.service";

let isWorkerInitialized = false;

export function startSlaBackgroundWorker() {
  if (isWorkerInitialized) return;
  isWorkerInitialized = true;

  console.log("[SLA Background Worker] Initialized locally. Running SLA checks every 15 minutes...");

  // Initial check 5 seconds after local server boot
  setTimeout(async () => {
    try {
      await SlaService.checkOverdueTickets();
      console.log("[SLA Background Worker] Local startup SLA check complete.");
    } catch (err) {
      console.error("[SLA Background Worker] Error running startup SLA check:", err);
    }
  }, 5000);

  // Scheduled interval every 15 minutes (900,000 ms)
  setInterval(async () => {
    try {
      console.log("[SLA Background Worker] Running local 15-minute scheduled SLA check...");
      await SlaService.checkOverdueTickets();
      console.log("[SLA Background Worker] Local 15-minute SLA check complete.");
    } catch (err) {
      console.error("[SLA Background Worker] Error running 15-minute SLA check:", err);
    }
  }, 15 * 60 * 1000);
}
