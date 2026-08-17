import { lockfileOf } from "@/features/eval/package";
import { loadOfficialSuite } from "@/features/eval/suite";

export async function GET() {
  const suite = await loadOfficialSuite();
  return Response.json(lockfileOf(suite), {
    headers: { "Cache-Control": "no-store" },
  });
}
