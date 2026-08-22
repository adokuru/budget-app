import {
  randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions,
} from "node:crypto";

// promisify() collapses scrypt to its 3-argument overload and drops the
// options parameter, so the cost parameters are wrapped by hand.
const scrypt = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });

/**
 * scrypt from node:crypto rather than an argon2 native module.
 *
 * OWASP ranks Argon2id first and scrypt second, both as acceptable password
 * hashes. scrypt is in the standard library, so there is no node-gyp build to
 * break in Docker and nothing to keep patched. The cost parameters below are
 * OWASP's recommended scrypt minimum (N=2^17, r=8, p=1), which is roughly
 * 128 MB of memory per hash.
 */
const N = 2 ** 17;
const r = 8;
const p = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

// scrypt needs a memory budget above N*r*128 or it refuses to run.
const MAX_MEMORY = 256 * 1024 * 1024;

export async function hashPassword(plain: string): Promise<string> {
  assertPasswordShape(plain);
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(plain.normalize("NFKC"), salt, KEY_LEN, {
    N, r, p, maxmem: MAX_MEMORY,
  });

  // Self-describing, so cost parameters can be raised later without
  // invalidating hashes already in the database.
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64!, "base64");
  const expected = Buffer.from(keyB64!, "base64");

  let actual: Buffer;
  try {
    actual = await scrypt(plain.normalize("NFKC"), salt, expected.length, {
      N: Number(nStr), r: Number(rStr), p: Number(pStr), maxmem: MAX_MEMORY,
    });
  } catch {
    return false;
  }

  // Constant time: a length check first, because timingSafeEqual throws on
  // mismatched lengths and that throw would itself leak length.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export class WeakPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeakPasswordError";
  }
}

/**
 * Length only, deliberately. Composition rules (a digit, a symbol) push people
 * toward Password1! and measurably weaken real passwords; NIST dropped them.
 */
export function assertPasswordShape(plain: string): void {
  if (typeof plain !== "string") throw new WeakPasswordError("password is required");
  if (plain.length < 10) throw new WeakPasswordError("password must be at least 10 characters");
  // bcrypt's 72-byte trap does not apply to scrypt, but an unbounded password
  // is a cheap denial of service: every login would hash megabytes.
  if (Buffer.byteLength(plain, "utf8") > 1024) {
    throw new WeakPasswordError("password must be under 1024 bytes");
  }
}
