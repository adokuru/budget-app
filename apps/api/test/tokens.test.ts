import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signAccessToken, verifyAccessToken, newRefreshToken, refreshTokenMatches,
  hashRefreshToken, newInviteCode, secretKey,
} from "../src/auth/tokens";

const SECRET = "a".repeat(48);

test("an access token round-trips its claims", async () => {
  const token = await signAccessToken({ sub: "user-1", did: "device-1" }, SECRET);
  assert.deepEqual(await verifyAccessToken(token, SECRET), { sub: "user-1", did: "device-1" });
});

test("a token signed with another secret is rejected", async () => {
  const token = await signAccessToken({ sub: "user-1", did: "device-1" }, SECRET);
  assert.equal(await verifyAccessToken(token, "b".repeat(48)), null);
});

test("garbage and tampered tokens are rejected, not thrown on", async () => {
  const token = await signAccessToken({ sub: "user-1", did: "device-1" }, SECRET);
  const tampered = token.slice(0, -3) + "aaa";
  for (const bad of ["", "not.a.token", tampered]) {
    assert.equal(await verifyAccessToken(bad, SECRET), null, bad);
  }
});

test("a weak or missing secret fails loudly instead of signing anyway", () => {
  assert.throws(() => secretKey(""), /at least 32/);
  assert.throws(() => secretKey("short"), /at least 32/);
});

test("refresh tokens are random and only their hash is stored", () => {
  const a = newRefreshToken();
  const b = newRefreshToken();
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.hash, b.hash);
  assert.ok(!a.hash.includes(a.token), "the raw token must not be recoverable");
  assert.equal(a.hash, hashRefreshToken(a.token));
});

test("refresh tokens match only themselves", () => {
  const a = newRefreshToken();
  const b = newRefreshToken();
  assert.ok(refreshTokenMatches(a.token, a.hash));
  assert.equal(refreshTokenMatches(b.token, a.hash), false);
  assert.equal(refreshTokenMatches(a.token, "deadbeef"), false);
  assert.equal(refreshTokenMatches(a.token, ""), false);
});

test("invite codes avoid glyphs people misread over WhatsApp", () => {
  for (let i = 0; i < 200; i++) {
    const code = newInviteCode();
    assert.equal(code.length, 6);
    assert.match(code, /^[A-HJ-NP-Z2-9]+$/, `${code} contains 0/O/1/I`);
  }
});

test("invite codes do not obviously collide", () => {
  const seen = new Set(Array.from({ length: 500 }, () => newInviteCode()));
  assert.ok(seen.size > 495, `only ${seen.size} unique of 500`);
});
