import { ensureReady } from "@/db/client";
import { probeText, startupzProbe } from "@/features/health/probe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureReady();
  } catch {
    return probeText(startupzProbe(false));
  }
  return probeText(startupzProbe(true));
}
