/**
 * Client-Side Cryptographic Password Hashing and Verification.
 * Uses SHA-256 + Salt via standard Web Crypto API.
 */

function getCrypto() {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  return null;
}

function generateSalt(length = 16) {
  const cryptoObj = getCrypto();
  if (cryptoObj && cryptoObj.getRandomValues) {
    const array = new Uint8Array(length);
    cryptoObj.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Safe pseudo-random fallback
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");
}

async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const cryptoObj = getCrypto();

  if (cryptoObj && cryptoObj.subtle && cryptoObj.subtle.digest) {
    const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("Web Crypto API is not available in the current browser runtime.");
}

/**
 * Hashes a plaintext password with a salt using SHA-256.
 * @param {string} password - The plaintext password.
 * @param {string} [customSalt] - Optional salt.
 * @returns {Promise<string>} The formatted hash string `salt:hash`.
 */
export async function hashPassword(password, customSalt = null) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  const salt = customSalt || generateSalt(16);
  const hash = await sha256Hex(`${salt}__expense_tracker_salt__${password}`);
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored `salt:hash` string.
 * @param {string} password - The plaintext password to verify.
 * @param {string} storedHash - The stored hash from the users table.
 * @returns {Promise<boolean>} True if matching, false otherwise.
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== "string") {
    return false;
  }
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }
  const [salt, expectedHash] = parts;
  const computedHash = await sha256Hex(`${salt}__expense_tracker_salt__${password}`);
  return computedHash === expectedHash;
}
