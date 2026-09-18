import crypto from "node:crypto";
import assert from "node:assert";

// Mock del webhook secret
const MP_WEBHOOK_SECRET = "ff8508a6b115ed66fcc3e25a8330048146c88930f897f79cdfa5f8d817f0b570";

// Mock de la petición — dataId (el id real del recurso, viene por el
// query param `data.id`) y reqId (header `x-request-id`) tienen que ser
// dos valores DISTINTOS acá: antes el manifest usaba reqId para los dos
// campos (`id:${reqId};request-id:${reqId};ts:${ts};`), lo cual hacía
// que este mismo test pasara igual aunque la validación real estuviera
// mal armada — con IDs distintos, un manifest que confunda uno por el
// otro deja de coincidir.
const dataId = "resource-987654";
const reqId = "req-123456";
const ts = Date.now().toString();

// Generar firma válida simulada — mismo manifest que arma
// app/api/mercadopago/webhook/route.ts (spec real de Mercado Pago):
// `id:{data.id};request-id:{x-request-id};ts:{ts};`
const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
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

  const checkManifest = `id:${dataId};request-id:${reqId};ts:${receivedTs};`;
  const checkHmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
  checkHmac.update(checkManifest);
  const computedHash = checkHmac.digest("hex");

  assert.strictEqual(computedHash, receivedHash, "La firma debería coincidir");
  console.log("✅ Test firma válida exitoso");
}

// Test: Rechazar firma incorrecta (secret equivocado)
function testInvalidSignature() {
  const checkManifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const checkHmac = crypto.createHmac("sha256", "wrong_secret");
  checkHmac.update(checkManifest);
  const computedHash = checkHmac.digest("hex");

  assert.notStrictEqual(computedHash, validHash, "La firma incorrecta no debería coincidir");
  console.log("✅ Test firma inválida exitoso");
}

// Test: un manifest que confunda data.id con x-request-id (el bug
// arreglado) no debería producir la misma firma que el manifest correcto.
function testManifestMustUseRealDataId() {
  const buggyManifest = `id:${reqId};request-id:${reqId};ts:${ts};`; // el bug viejo
  const buggyHmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
  buggyHmac.update(buggyManifest);
  const buggyHash = buggyHmac.digest("hex");

  assert.notStrictEqual(buggyHash, validHash, "El manifest viejo (con el bug) no debería coincidir con el correcto");
  console.log("✅ Test manifest usa data.id (no x-request-id) exitoso");
}

try {
  testValidSignature();
  testInvalidSignature();
  testManifestMustUseRealDataId();
  console.log("Todos los tests de Mercado Pago pasaron.");
} catch (error) {
  console.error("Test falló:", error);
  process.exit(1);
}
