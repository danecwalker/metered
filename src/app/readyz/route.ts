import { ensureReady, pingDatabase } from "@/db/client";
import { probeText, readyzProbe } from "@/features/health/probe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureReady();
  } catch {
    return probeText(readyzProbe(false, false));
  }
  return probeText(readyzProbe(true, await pingDatabase()));
}
