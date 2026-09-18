import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createCaseSessionToken, verifyCaseSessionToken } from "../lib/sessionToken";

test("createCaseSessionToken + verifyCaseSessionToken: un token recién creado devuelve el mismo caseId", () => {
  const token = createCaseSessionToken("case-abc-123");
  assert.equal(verifyCaseSessionToken(token), "case-abc-123");
});

test("verifyCaseSessionToken rechaza un caseId crudo sin firmar (formato viejo, pre-SEC-01)", () => {
  assert.equal(verifyCaseSessionToken("case-abc-123"), null);
  assert.equal(verifyCaseSessionToken("demo"), null);
});

test("verifyCaseSessionToken rechaza un token con la firma alterada", () => {
  const token = createCaseSessionToken("case-abc-123");
  const [caseId, issuedAt] = token.split(".");
  const tampered = `${caseId}.${issuedAt}.firma-inventada`;
  assert.equal(verifyCaseSessionToken(tampered), null);
});

test("verifyCaseSessionToken rechaza un token con el caseId cambiado sin re-firmar (no se puede fabricar sesión de otro caso)", () => {
  const token = createCaseSessionToken("case-mio");
  const [, issuedAt, signature] = token.split(".");
  const forged = `case-de-otra-familia.${issuedAt}.${signature}`;
  assert.equal(verifyCaseSessionToken(forged), null);
});

test("verifyCaseSessionToken rechaza un token vencido (más de 90 días)", () => {
  const caseId = "case-viejo";
  const issuedAt = Date.now() - 91 * 24 * 60 * 60 * 1000;
  // Reconstruye la firma como lo haría createCaseSessionToken, pero con
  // un issuedAt viejo — no hay forma de pedirle a la API pública un
  // token ya vencido, así que se firma a mano con la misma lógica.
  const secret = process.env.CASE_SECRET_KEY!;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${caseId}.${issuedAt}`);
  const signature = hmac.digest("base64url");
  const expired = `${caseId}.${issuedAt}.${signature}`;
  assert.equal(verifyCaseSessionToken(expired), null);
});

test("verifyCaseSessionToken rechaza basura / formato malformado", () => {
  assert.equal(verifyCaseSessionToken(""), null);
  assert.equal(verifyCaseSessionToken("a.b"), null);
  assert.equal(verifyCaseSessionToken("a.b.c.d"), null);
  assert.equal(verifyCaseSessionToken("case-x.no-es-numero.firma"), null);
});
