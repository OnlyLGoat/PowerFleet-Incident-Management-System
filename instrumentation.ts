export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSlaBackgroundWorker } = await import('@/lib/cron/sla-worker');
    startSlaBackgroundWorker();
  }
}
