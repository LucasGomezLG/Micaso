import fs from "fs";
import path from "path";

async function main() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/^MP_ACCESS_TOKEN=(.*)$/m);
    if (match) {
      process.env.MP_ACCESS_TOKEN = match[1].trim();
    }
  }

  const { createSubscriptionCheckout } = await import("../lib/mercadopago");

  try {
    console.log("Generando link de pago de prueba...");
    const result = await createSubscriptionCheckout({
      brokerId: "test-broker-123",
      email: "test.micaso.random123456789@micaso.com.ar", // Fake email
      plan: "para_arrancar",
      backUrl: "https://www.micaso.com.ar/panel/plan?payment=success",
    });
    console.log("✅ ÉXITO! Link de checkout generado:");
    console.log(result.initPoint);
  } catch (error) {
    console.error("❌ FALLÓ la creación del link:", error);
  }
}

main();
