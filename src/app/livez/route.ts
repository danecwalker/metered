import { livezProbe, probeText } from "@/features/health/probe";

export const dynamic = "force-dynamic";

export function GET() {
  return probeText(livezProbe());
}
