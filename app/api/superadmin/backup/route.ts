import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { buildFullBackup } from "@/lib/backup";

/** Descarga de toda la base en un solo JSON — corredores, casos, casas,
 * checklist y criterios de cada uno. Pensado para que Lucas tenga algo
 * fuera de Redis/el archivo local mientras no exista un backup
 * automático (ver ARQUITECTURA.md sección 9, incidente de la condición
 * de carrera). Solo lectura, no restaura nada todavía. */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code || code !== process.env.ADMIN_BACKUP_CODE) {
    return NextResponse.json({ error: "Código de seguridad inválido" }, { status: 403 });
  }

  const backup = await buildFullBackup();
  const filename = `micaso-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
