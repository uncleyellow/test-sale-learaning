const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

function comparePassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "8h" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken
};
