import type { Metadata } from "next";
import Link from "next/link";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Política de Privacidad — Micaso",
  description:
    "Política de privacidad y protección de datos personales de Micaso en cumplimiento de la Ley 25.326 y normativas de la AAIP.",
};

export default function PrivacidadPage() {
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
              href="/terminos"
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ color: "var(--ink-muted)", border: "1px solid var(--border)" }}
            >
              Términos de servicio
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <p className="eyebrow mb-2">Protección de Datos Personales</p>
          <h1 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Política de Privacidad
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
            Ley N° 25.326 (Habeas Data) · República Argentina · Última actualización: Septiembre de 2026
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
            Tu privacidad en Micaso (en pocas palabras)
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed sm:text-sm" style={{ color: "var(--ink)" }}>
            <li>
              <strong>Aislamiento total de casos:</strong> Cada búsqueda de vivienda vive en un entorno estanco. Ninguna otra familia ni ningún otro corredor puede ver lo que cargás en tu caso.
            </li>
            <li>
              <strong>Cero venta de datos:</strong> No comercializamos, no cedemos ni monetizamos tus datos personales con inmobiliarias ajenas, bancos ni redes de publicidad.
            </li>
            <li>
              <strong>Qué guardamos:</strong> Tu nombre o alias, las propiedades que vas viendo, comentarios de visitas, notas y el presupuesto que cargás con tu corredor.
            </li>
            <li>
              <strong>Tus derechos:</strong> Podés acceder, corregir o pedir el borrado completo de tus datos en cualquier momento.
            </li>
          </ul>
        </div>

        {/* Articulado Legal Completo */}
        <div className="prose flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              1. Marco normativo y compromiso de privacidad
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Micaso (en adelante, la &quot;Plataforma&quot;) trata los datos personales de sus usuarios conforme a los estándares exigidos por la <strong>Ley N° 25.326 de Protección de los Datos Personales</strong>, su Decreto Reglamentario N° 1558/2001 y las resoluciones complementarias dictadas por la <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> de la República Argentina.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              La presente Política aplica a todos los corredores inmobiliarios registrados (&quot;Corredores&quot;) y a los clientes y familias invitados a colaborar en un caso de búsqueda inmobiliaria (&quot;Familias&quot; o &quot;Usuarios de Casos&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              2. Roles y responsabilidades en el tratamiento de datos
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              En cumplimiento del régimen legal argentino, se establecen los siguientes roles:
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li>
                <strong>Corredor Inmobiliario (Responsable del Tratamiento):</strong> Es quien decide la apertura de un caso para su cliente, recolecta sus datos en el marco del encargo profesional inmobiliario y los ingresa a la Plataforma. El Corredor es el responsable primario de contar con el consentimiento previo de su cliente.
              </li>
              <li>
                <strong>Micaso (Encargado del Tratamiento):</strong> Provee la infraestructura de software, bases de datos y seguridad técnica para procesar la información por cuenta y orden del Corredor y de la Familia, sin utilizar los datos para fines propios ni comercializarlos.
              </li>
              <li>
                <strong>Micaso como Responsable:</strong> Únicamente respecto de los datos de registro directo del Corredor (email institucional o de Google, nombre comercial o avatar, y gestión de su suscripción de software).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              3. Datos personales recabados y exclusión de datos sensibles
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Datos que se recopilan:</strong>
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li><em>Del Corredor:</em> Nombre, dirección de correo electrónico provista por el proveedor de autenticación (Google OAuth), nombre comercial y foto de perfil / logo.</li>
              <li><em>De los Casos (Familias):</em> Nombre o alias de los integrantes que participan en la búsqueda, preferencias de inmuebles, enlaces de propiedades agregadas, notas privadas, valoraciones de visitas y datos orientativos de presupuesto cargados voluntariamente.</li>
            </ul>
            <p className="mt-3 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Exclusión absoluta de datos sensibles:</strong> Micaso <strong>no solicita, no almacena ni procesa datos sensibles</strong> (conforme al art. 2 de la Ley 25.326: origen racial o étnico, opiniones políticas, convicciones religiosas o filosóficas, afiliación sindical, información referente a la salud o vida sexual). Asimismo, Micaso <strong>no almacena números de tarjeta ni datos bancarios</strong> de las familias clientes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              4. Finalidad del tratamiento y prohibición de comercialización
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              La información recopilada tiene por única y exclusiva finalidad operativa posibilitar la visualización sincronizada, la comparación de propiedades, la coordinación de visitas y el seguimiento del checklist entre el Corredor y su Cliente.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              <strong>Compromiso de no cesión ni monetización:</strong> Micaso no vende, no alquila, no cede ni transfiere datos personales a inmobiliarias ajenas, entidades financieras, empresas de corretaje ni agencias de publicidad o prospección comercial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              5. Aislamiento de casos (Tenant Isolation) y seguridad técnica
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Micaso aplica una arquitectura estricta de aislamiento de datos:
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li>Cada caso está segregado con claves y permisos criptográficos únicos. Ningún usuario externo ni ningún otro corredor puede acceder al contenido de un caso sin las credenciales legítimas.</li>
              <li>Todas las comunicaciones entre el navegador y los servidores de Micaso se realizan bajo canales cifrados mediante protocolo HTTPS / TLS de alta seguridad.</li>
              <li>Las sesiones se protegen mediante cookies de autenticación con banderas <code>HttpOnly</code>, <code>SameSite=Lax</code> y protección contra falsificación de peticiones.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              6. Conservación, archivo y derecho al olvido
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Los datos vinculados a un caso se conservan mientras la búsqueda permanezca en estado activo. Tras el cierre voluntario o conclusión del caso, se mantiene una copia de consulta en solo lectura por un período de gracia de hasta noventa (90) días corridos para resguardo de los involucrados. Cumplido dicho plazo, el caso pasa al estado de archivo y se mantiene en resguardo hasta que el titular o el Corredor soliciten su supresión definitiva, o hasta la ejecución de tareas programadas de depuración de almacenamiento.
            </p>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Cualquiera de los integrantes autorizados o el Corredor interviniente pueden solicitar en cualquier momento la supresión inmediata y definitiva del caso y de todos los registros históricos asociados, aplicando el derecho al olvido.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              7. Derechos ARCO (Acceso, Rectificación, Actualización y Supresión)
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              De acuerdo con los artículos 14, 15 y 16 de la Ley N° 25.326, los titulares de datos personales gozan de los siguientes derechos en forma gratuita:
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li><strong>Derecho de Acceso:</strong> Conocer qué datos personales propios se encuentran asentados en la Plataforma.</li>
              <li><strong>Derecho de Rectificación y Actualización:</strong> Corregir información inexacta, incompleta o desactualizada.</li>
              <li><strong>Derecho de Supresión:</strong> Exigir la baja y eliminación definitiva de sus datos personales.</li>
            </ul>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Para ejercer cualquiera de estos derechos, el titular puede enviar un mensaje a través del canal de contacto disponible en la Plataforma acreditando su identidad. La solicitud será respondida dentro de los plazos legales establecidos por la normativa argentina (10 días corridos para el acceso, 5 días hábiles para la rectificación o supresión).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              8. Información legal requerida por la AAIP (Res. 14/2018)
            </h2>
            <div
              className="mt-3 rounded-xl border p-4 text-xs sm:text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <p className="italic" style={{ color: "var(--ink-muted)" }}>
                &quot;El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.&quot;
              </p>
              <p className="mt-3 font-medium" style={{ color: "var(--ink)" }}>
                &quot;La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.&quot;
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              9. Cookies y almacenamiento local
            </h2>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              Micaso utiliza exclusivamente cookies y almacenamiento local indispensables para el funcionamiento técnico:
            </p>
            <ul className="mt-2 list-disc pl-5 text-justify" style={{ color: "var(--ink-muted)" }}>
              <li><strong>Cookies de sesión:</strong> Necesarias para mantener iniciada la sesión de forma segura y validar el acceso al caso o panel.</li>
              <li><strong>Almacenamiento local (localStorage):</strong> Guarda únicamente la preferencia visual de tema (modo claro o modo oscuro).</li>
            </ul>
            <p className="mt-2 text-justify" style={{ color: "var(--ink-muted)" }}>
              No utilizamos cookies publicitarias, píxeles de seguimiento ni herramientas de telemetría invasiva de terceros.
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
              <Link href="/terminos" className="hover:underline">
                Ver Términos y Condiciones
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
