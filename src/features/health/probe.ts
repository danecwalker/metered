export type ProbeResult = {
  status: 200 | 503;
  body: string;
};

const HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

export function probeText(result: ProbeResult): Response {
  return new Response(result.body, {
    status: result.status,
    headers: HEADERS,
  });
}

export function livezProbe(): ProbeResult {
  return { status: 200, body: "ok\n" };
}

export function startupzProbe(booted: boolean): ProbeResult {
  if (!booted) return { status: 503, body: "starting\n" };
  return { status: 200, body: "ok\n" };
}

export function readyzProbe(booted: boolean, databaseOk: boolean): ProbeResult {
  if (!booted) return { status: 503, body: "starting\n" };
  if (!databaseOk) return { status: 503, body: "db not ready\n" };
  return { status: 200, body: "ok\n" };
}
