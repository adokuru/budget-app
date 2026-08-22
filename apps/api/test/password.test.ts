import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, assertPasswordShape, WeakPasswordError }
  from "../src/auth/password";

test("a correct password verifies", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.ok(await verifyPassword("correct horse battery", hash));
});

test("a wrong password does not verify", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse batteries", hash), false);
  assert.equal(await verifyPassword("", hash), false);
});

test("the same password hashes differently every time", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.notEqual(a, b, "salt is not being applied");
  assert.ok(await verifyPassword("correct horse battery", a));
  assert.ok(await verifyPassword("correct horse battery", b));
});

test("the hash never contains the password", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.ok(!hash.includes("correct horse battery"));
  assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test("a malformed stored hash returns false rather than throwing", async () => {
  for (const bad of ["", "garbage", "scrypt$1$2$3", "bcrypt$a$b$c$d$e", "scrypt$x$y$z$!!$!!"]) {
    assert.equal(await verifyPassword("anything", bad), false, bad);
  }
});

test("unicode passwords normalize, so the same typed password always works", async () => {
  // é as one codepoint vs e + combining accent
  const composed = "café-password-1";
  const decomposed = "café-password-1";
  const hash = await hashPassword(composed);
  assert.ok(await verifyPassword(decomposed, hash));
});

test("short passwords are rejected", () => {
  assert.throws(() => assertPasswordShape("short"), WeakPasswordError);
  assert.throws(() => assertPasswordShape("123456789"), WeakPasswordError);
  assert.doesNotThrow(() => assertPasswordShape("1234567890"));
});

test("absurdly long passwords are rejected, so login cannot be a DoS", () => {
  assert.throws(() => assertPasswordShape("a".repeat(2000)), WeakPasswordError);
});
