import type { Metadata } from "next";
import Link from "next/link";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Servicio — Micaso",
  description:
    "Términos y condiciones legales que rigen el uso de la plataforma Micaso para corredores inmobiliarios y familias.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-full" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
            >
              <MicasoMark size={16} color="var(--accent-ink)" />
            </span>
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Micaso
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/privacidad"
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ color: "var(--ink-muted)", border: "1px solid var(--border)" }}
            >
              Política de privacidad
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <p className="eyebrow mb-2">Aspectos legales y contractuales</p>
          <h1 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Términos y Condiciones de Servicio
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
            Última actualización: Septiembre de 2026 · República Argentina
          </p>
        </div>

        {/* Resumen en lenguaje claro */}
        <div
          className="mb-10 rounded-2xl border p-5 sm:p-6"
          style={{
            borderColor: "var(--accent-soft-border)",
            background: "var(--accent-soft)",
          }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--accent)" }}>
            Resumen en lenguaje claro (para lectura rápida)
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed sm:text-sm" style={{ color: "var(--ink)" }}>
            <li>
              <strong>Micaso es una herramienta de software (SaaS):</strong> No somos una inmobiliaria ni realizamos corretaje o cobro de comisiones inmobiliarias.
            </li>
            <li>
              <strong>Responsabilidad de datos del corredor:</strong> Si sos corredor y cargás información de tus clientes, garantizás contar con su consentimiento para hacerlo.
            </li>
            <li>
              <strong>Prueba y suscripción:</strong> Tenés 14 días de prueba gratis sin tarjeta. Si contratás un plan pago, se cobra mensualmente en pesos vía Mercado Pago y podés cancelar cuando quieras sin penalidad.
            </li>
            <li>
              <strong>Calculadoras y portales:</strong> La calculadora y las estimaciones de gastos (8,5%) son orientativas y no reemplazan a tu escribano o banco. La información de propiedades proviene de portales públicos de terceros.
            </li>
          </ul>
        </div>

        {/* Articulado Legal Completo */}
        <div className="prose flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              1. Aceptación y partes intervinientes
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Los presentes Términos y Condiciones de Servicio (en adelante, los &quot;Términos&quot;) regulan el acceso y uso de la plataforma digital Micaso (en adelante, la &quot;Plataforma&quot;), accesible vía web, por parte de los profesionales o firmas del sector inmobiliario (en adelante, el &quot;Corredor&quot; o &quot;Suscriptor&quot;) y de las personas humanas invitadas a colaborar en un caso de búsqueda inmobiliaria (en adelante, el &quot;Cliente&quot; o la &quot;Familia&quot;).
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              El registro, inicio de sesión (mediante Google OAuth o credenciales de caso) o uso continuado de la Plataforma implica el consentimiento pleno, libre e informado y la adhesión incondicional a estos Términos, conforme a lo establecido en los artículos 1105 y concordantes del Código Civil y Comercial de la Nación de la República Argentina.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              2. Naturaleza del servicio — Exclusión expresa de corretaje inmobiliario
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Micaso es exclusivamente un proveedor de tecnología y software como servicio (SaaS) concebido para optimizar la organización, seguimiento y comunicación privada entre corredores y sus clientes.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Micaso NO es inmobiliaria, martillero ni intermediario de corretaje inmobiliario.</strong> Micaso no se encuentra matriculada bajo la Ley Nacional N° 20.266, Ley CABA N° 2.340, Ley PBA N° 10.973 ni normativas provinciales concordantes. Por consiguiente, Micaso:
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li>No interviene en la negociación, oferta, reserva, seña, boleto de compraventa ni escrituración de inmuebles.</li>
              <li>No percibe comisión, arancel ni honorario alguno sobre las operaciones inmobiliarias concretadas por los usuarios.</li>
              <li>No responde por la veracidad de los títulos dominiales, gravámenes, inhibiciones o condiciones físicas ni jurídicas de las propiedades registradas en la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              3. Obligaciones del Corredor y protección de datos (Ley 25.326)
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              En los términos de la Ley N° 25.326 de Protección de los Datos Personales de la República Argentina, el Corredor reviste el carácter jurídico de <strong>Responsable del Tratamiento</strong> respecto de los datos personales (nombres, contactos, presupuestos, notas de visitas) que decida cargar en los casos de la Plataforma.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              El Corredor declara, garantiza y se compromete bajo juramento a:
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li>Contar con el consentimiento previo, informado e inequívoco de sus clientes antes de incorporar sus datos a Micaso.</li>
              <li>Utilizar la Plataforma exclusivamente para la gestión lícita de la búsqueda inmobiliaria encomendada.</li>
              <li>Mantener indemne a Micaso frente a cualquier reclamo administrativo (AAIP) o judicial iniciado por terceros a raíz de datos suministrados sin su previa autorización.</li>
            </ul>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Micaso actúa en carácter de <strong>Encargado del Tratamiento</strong>, procesando la información únicamente siguiendo las instrucciones operativas del Corredor y manteniendo el estricto aislamiento entre casos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              4. Condiciones comerciales, suscripción y política de cancelación
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Período de prueba gratuito:</strong> Los nuevos Corredores acceden a un período de prueba de catorce (14) días corridos sin costo alguno y sin obligación de ingresar datos de pago o tarjeta de crédito.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Suscripciones y cobro:</strong> Finalizado el período de prueba, el acceso a la creación y gestión plena de casos queda supeditado a la contratación de un plan mensual tarifado por cupo de casos activos simultáneos. Los pagos se procesan de forma recurrente en Pesos Argentinos (ARS) a través de la pasarela autorizada Mercado Pago.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Cancelación sin penalidad:</strong> El Suscriptor puede cancelar su suscripción en cualquier momento desde su panel. La cancelación surte efectos a partir de la finalización del período mensual vigente ya abonado, sin cargos punitorios ni reembolsos retroactivos proporcionales.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Mora y ciclo de vida de los datos:</strong> En caso de falta de pago o conclusión del período de prueba sin suscripción activa, la cuenta pasará a la modalidad de <em>solo lectura</em> por un plazo de gracia de noventa (90) días corridos, permitiendo la consulta del historial. Expirado dicho plazo, los casos pasarán al estado de archivo (quedando desactivados e inaccesibles para nuevas operaciones) y se conservarán en resguardo hasta tanto el Corredor o la Familia soliciten formalmente su supresión y eliminación definitiva, o bien hasta que Micaso ejecute procesos periódicos de depuración de almacenamiento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              5. Scraping, autocompletado y enlaces a sitios de terceros
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              La funcionalidad de autocompletado de fichas inmobiliarias extrae información pública disponible en portales de terceros (tales como ZonaProp, ArgenProp, MercadoLibre, entre otros) a solicitud expresa y bajo la exclusiva instrucción del usuario.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Los textos, fotografías, marcas y logotipos de dichos inmuebles pertenecen a sus legítimos autores y anunciantes. Micaso no almacena ni comercializa bases públicas de ofertas inmobiliarias. Micaso no responde por modificaciones de precio, retiro de publicación ni falta de disponibilidad de los inmuebles indexados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              6. Simuladores y calculadoras financieras
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Las herramientas de calculadora (simulación de cuotas hipotecarias, gastos de escrituración estimados al 8,5% y balances de fondos) provistas en la Plataforma revisten naturaleza meramente didáctica, ilustrativa y referencial.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>No constituyen oferta financiera vinculante, tasación notarial ni dictamen legal.</strong> Los costos definitivos de escrituración, tributos provinciales, honorarios notariales y tasas de interés bancarias deben ser validados fehacientemente con el escribano interviniente y la entidad crediticia respectiva.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              7. Propiedad intelectual y licencia de software
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              La Plataforma, su código fuente, arquitectura, diseño gráfico, logotipos y la marca Micaso son de propiedad exclusiva de su titular. Se otorga al usuario una licencia de uso de software revocable, no exclusiva, limitada e intransferible. Queda expresamente prohibida la ingeniería inversa, descompilación, reventa o explotación no autorizada del software.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              8. Limitación de responsabilidad
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              En la máxima medida autorizada por el Código Civil y Comercial de la Nación, Micaso no será responsable por daños indirectos, lucro cesante, pérdida de chances, pérdida de datos ni eventuales perjuicios derivados de la frustración de operaciones inmobiliarias entre el Corredor y sus Clientes. La Plataforma se suministra bajo el criterio de &quot;tal cual es&quot; (<em>as is</em>), comprometiendo esfuerzos técnicamente razonables de disponibilidad y seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              9. Jurisdicción y ley aplicable
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Los presentes Términos se rigen e interpretan por las leyes de la República Argentina. Cualquier divergencia, controversia o litigio que derive de su existencia, validez, interpretación o cumplimiento será sometido a la competencia exclusiva de los Tribunales Ordinarios en lo Comercial de la Ciudad Autónoma de Buenos Aires, con expresa renuncia a cualquier otro fuero o jurisdicción territorial.
            </p>
          </section>
        </div>

        {/* Footer de navegación */}
        <div className="mt-14 border-t pt-8" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs" style={{ color: "var(--ink-muted)" }}>
            <Link href="/" className="hover:underline">
              ← Volver al inicio de Micaso
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/privacidad" className="hover:underline">
                Ver Política de Privacidad
              </Link>
              <Link href="/login" className="hover:underline">
                Ingreso a casos
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
