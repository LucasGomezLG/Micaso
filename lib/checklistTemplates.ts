import { ChecklistItem, TipoCaso } from "./types";

type TemplateItem = Omit<ChecklistItem, "id">;

function item(group: string, label: string): TemplateItem {
  return { group, label, done: false, assignedTo: null, notes: "" };
}

// Plantillas genéricas por tipoCaso — a diferencia de SEED_CHECKLIST
// (lib/seed.ts), que es el estado real y particular del caso demo de
// Lucas y Abril, esto es lo que arranca cualquier caso NUEVO: todo sin
// marcar, sin asignar a nadie en particular. Ver ARQUITECTURA.md
// sección 8, fila lib/seed.ts.
const COMPRA: TemplateItem[] = [
  item("Condiciones del banco", "Contratar seguro de auto (si lo pide el banco)"),
  item("Condiciones del banco", "Contratar seguro de hogar (si lo pide el banco)"),
  item("Condiciones del banco", "Acreditar el sueldo en la cuenta del banco"),
  item("Búsqueda y visitas", "Definir zonas y requisitos prioritarios"),
  item("Búsqueda y visitas", "Coordinar visitas"),
  item("Búsqueda y visitas", "Elegir 2-3 casas favoritas para avanzar con oferta"),
  item("Documentación", "DNI de todos los titulares"),
  item("Documentación", "Últimos 3 recibos de sueldo"),
  item("Documentación", "Constancia de CUIL / CUIT"),
  item("Documentación", "Certificado de CBU de la cuenta sueldo"),
  item("Trámite de la propiedad elegida", "Tasación del banco"),
  item("Trámite de la propiedad elegida", "Estudio de títulos (escribano)"),
  item("Trámite de la propiedad elegida", "Boleto de compraventa / seña"),
  item("Trámite de la propiedad elegida", "Firma de escritura"),
];

const ALQUILER: TemplateItem[] = [
  item("Búsqueda y visitas", "Definir zonas y requisitos prioritarios"),
  item("Búsqueda y visitas", "Coordinar visitas"),
  item("Búsqueda y visitas", "Elegir 2-3 propiedades favoritas para avanzar"),
  item("Documentación", "DNI de todos los titulares"),
  item("Documentación", "Últimos 3 recibos de sueldo o constancia de ingresos"),
  item("Documentación", "Definir garantía: propietaria, seguro de caución o garante"),
  item("Trámite de la propiedad elegida", "Presentar la garantía elegida"),
  item("Trámite de la propiedad elegida", "Firma del contrato de locación"),
  item("Trámite de la propiedad elegida", "Pagar depósito, primer mes y comisión"),
  item("Trámite de la propiedad elegida", "Inventario y estado del inmueble al recibir las llaves"),
];

const OTRO: TemplateItem[] = [
  item("Búsqueda y visitas", "Definir zonas y requisitos prioritarios"),
  item("Búsqueda y visitas", "Coordinar visitas"),
  item("Documentación", "DNI de todos los titulares"),
];

const TEMPLATES: Record<TipoCaso, TemplateItem[]> = {
  compra: COMPRA,
  alquiler: ALQUILER,
  otro: OTRO,
};

export function buildChecklistTemplate(tipoCaso: TipoCaso): ChecklistItem[] {
  return TEMPLATES[tipoCaso].map((template) => ({ ...template, id: crypto.randomUUID() }));
}
