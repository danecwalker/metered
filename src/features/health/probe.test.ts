import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { livezProbe, probeText, readyzProbe, startupzProbe } from "./probe";

describe("livezProbe", () => {
  it("is always 200 — a cheap process check", () => {
    assert.deepEqual(livezProbe(), { status: 200, body: "ok\n" });
  });
});

describe("startupzProbe", () => {
  it("is 503 until boot finishes", () => {
    assert.deepEqual(startupzProbe(false), { status: 503, body: "starting\n" });
  });

  it("is 200 once the listen loop and boot work have finished", () => {
    assert.deepEqual(startupzProbe(true), { status: 200, body: "ok\n" });
  });
});

describe("readyzProbe", () => {
  it("is 503 before boot and when the database ping fails", () => {
    assert.deepEqual(readyzProbe(false, false), { status: 503, body: "starting\n" });
    assert.deepEqual(readyzProbe(false, true), { status: 503, body: "starting\n" });
    assert.deepEqual(readyzProbe(true, false), { status: 503, body: "db not ready\n" });
  });

  it("is 200 only when boot finished and the database answers", () => {
    assert.deepEqual(readyzProbe(true, true), { status: 200, body: "ok\n" });
  });
});

describe("probeText", () => {
  it("returns a tiny plaintext body with no store", async () => {
    const response = probeText({ status: 503, body: "starting\n" });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "starting\n");
  });
});
