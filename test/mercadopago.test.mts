import crypto from "node:crypto";
import assert from "node:assert";

// Mock del webhook secret
const MP_WEBHOOK_SECRET = "ff8508a6b115ed66fcc3e25a8330048146c88930f897f79cdfa5f8d817f0b570";

// Mock de la petición
const reqId = "req-123456";
const ts = Date.now().toString();

// Generar firma válida simulada
const manifest = `id:${reqId};request-id:${reqId};ts:${ts};`;
const hmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
hmac.update(manifest);
const validHash = hmac.digest("hex");

const signatureHeader = `ts=${ts},v1=${validHash}`;

// Test: Validar firma correcta
function testValidSignature() {
  const parts = signatureHeader.split(",");
  let receivedTs = "";
  let receivedHash = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "ts") receivedTs = value;
    if (key === "v1") receivedHash = value;
  }

  const checkManifest = `id:${reqId};request-id:${reqId};ts:${receivedTs};`;
  const checkHmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
  checkHmac.update(checkManifest);
  const computedHash = checkHmac.digest("hex");

  assert.strictEqual(computedHash, receivedHash, "La firma debería coincidir");
  console.log("✅ Test firma válida exitoso");
}

// Test: Rechazar firma incorrecta
function testInvalidSignature() {
  const checkManifest = `id:${reqId};request-id:${reqId};ts:${ts};`;
  const checkHmac = crypto.createHmac("sha256", "wrong_secret");
  checkHmac.update(checkManifest);
  const computedHash = checkHmac.digest("hex");

  assert.notStrictEqual(computedHash, validHash, "La firma incorrecta no debería coincidir");
  console.log("✅ Test firma inválida exitoso");
}

try {
  testValidSignature();
  testInvalidSignature();
  console.log("Todos los tests de Mercado Pago pasaron.");
} catch (error) {
  console.error("Test falló:", error);
  process.exit(1);
}
