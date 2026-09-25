// Generador de carga contra la app local (`next start` en el puerto 3100)
// apuntada al mock de Upstash — ver README.md de esta carpeta.
//
// Uso: node scripts/load-test/loadtest.mjs <escenario> [concurrencia] [segundos] [latenciaMs] [seed.json]
//
// Escenarios con carga sostenida: familia-casas, familia-agenda,
// familia-comenta-distintos, familia-comenta-mismo-caso, corredor-panel,
// corredor-panel-mismo, alta-casos.
// De una sola pasada: calentar (visita cada caso y cada panel una vez, para
// que las claves que se crean en la primera lectura no ensucien la medición),
// backup y cron.
import { readFileSync } from "node:fs";

const APP = process.env.LOAD_APP_URL ?? "http://127.0.0.1:3100";
const MOCK = process.env.UPSTASH_REDIS_REST_URL ?? "http://127.0.0.1:8079";
const [scenario, conc, secs, latency, seedFile] = [
  process.argv[2],
  Number(process.argv[3] ?? 10),
  Number(process.argv[4] ?? 10),
  Number(process.argv[5] ?? 0),
  process.argv[6] ?? "scripts/load-test/out/seed.json",
];

if (!APP.startsWith("http://127.0.0.1") && !APP.startsWith("http://localhost")) {
  // Protección: nunca apuntarle carga a producción ni a un preview.
  throw new Error(`LOAD_APP_URL tiene que ser local, no "${APP}".`);
}

const seed = JSON.parse(readFileSync(seedFile, "utf8"));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const family = (c) => ({ cookie: `case_id=${c.cookie}` });
const broker = (b) => ({ cookie: `authjs.session-token=${b.cookie}` });
const json = (headers, body) => ({ method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) });
const comment = { author: "Ana", text: "Comentario de prueba de carga" };

const sustained = {
  "familia-casas": () => ({ url: "/caso/casas", init: { headers: family(pick(seed.cases)) } }),
  "familia-agenda": () => ({ url: "/caso/agenda", init: { headers: family(pick(seed.cases)) } }),
  "familia-comenta-distintos": (w) => {
    const c = seed.cases[w % seed.cases.length];
    return { url: `/api/houses/${pick(c.houseIds)}/comments`, init: json(family(c), comment) };
  },
  "familia-comenta-mismo-caso": () => {
    const c = seed.cases[0];
    return { url: `/api/houses/${pick(c.houseIds)}/comments`, init: json(family(c), comment) };
  },
  "corredor-panel": () => ({ url: "/panel", init: { headers: broker(pick(seed.brokers)) } }),
  "corredor-panel-mismo": () => ({ url: "/panel", init: { headers: broker(seed.brokers[0]) } }),
  "alta-casos": () => ({ url: "/api/panel/cases", init: json(broker(pick(seed.brokers)), { titulo: "Alta de carga", tipoCaso: "compra" }) }),
};

const mock = async (path) => (await fetch(`${MOCK}${path}`)).json();
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

async function runSustained(make) {
  const latencies = [];
  const statuses = {};
  const errors = {};
  const deadline = Date.now() + secs * 1000;
  const t0 = Date.now();
  async function worker(w) {
    while (Date.now() < deadline) {
      const { url, init } = make(w);
      const start = Date.now();
      try {
        const res = await fetch(APP + url, { ...init, redirect: "manual" });
        const body = await res.text();
        statuses[res.status] = (statuses[res.status] ?? 0) + 1;
        if (res.status >= 400) errors[`${res.status}: ${body.slice(0, 120)}`] = (errors[`${res.status}: ${body.slice(0, 120)}`] ?? 0) + 1;
      } catch (e) {
        statuses.exception = (statuses.exception ?? 0) + 1;
        errors[e.message] = (errors[e.message] ?? 0) + 1;
      }
      latencies.push(Date.now() - start);
    }
  }
  await Promise.all(Array.from({ length: conc }, (_, w) => worker(w)));
  const elapsed = (Date.now() - t0) / 1000;
  const stats = await mock("/__stats");
  latencies.sort((a, b) => a - b);
  const n = latencies.length;
  return {
    pedidos: n,
    porSegundo: +(n / elapsed).toFixed(1),
    p50: pct(latencies, 50),
    p95: pct(latencies, 95),
    p99: pct(latencies, 99),
    max: latencies[n - 1],
    statuses,
    comandosPorPedido: +(stats.commands / n).toFixed(1),
    pedidosUpstashPorPedido: +(stats.httpRequests / n).toFixed(1),
    reintentosDeLock: stats.lockSpinsFailed,
    porComando: stats.byCommand,
    maxRespuestaUpstashKB: Math.round(stats.maxResponseBytes / 1024),
    mbDesdeUpstash: +(stats.responseBytes / 1_048_576).toFixed(1),
    errores: errors,
  };
}

async function once(url, headers) {
  const start = Date.now();
  const res = await fetch(APP + url, { headers, redirect: "manual" });
  const body = await res.text();
  const stats = await mock("/__stats");
  return {
    status: res.status,
    ms: Date.now() - start,
    respuestaMB: +(body.length / 1_048_576).toFixed(1),
    comandos: stats.commands,
    maxRespuestaUpstashMB: +(stats.maxResponseBytes / 1_048_576).toFixed(1),
  };
}

async function warmUp() {
  const queue = [...seed.cases];
  const t0 = Date.now();
  async function worker() {
    for (let c = queue.pop(); c; c = queue.pop()) {
      for (const url of ["/caso", "/caso/casas", "/caso/agenda", "/caso/checklist"]) {
        await (await fetch(APP + url, { headers: family(c), redirect: "manual" })).text();
      }
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));
  for (const b of seed.brokers) await (await fetch(`${APP}/panel`, { headers: broker(b), redirect: "manual" })).text();
  return { casos: seed.cases.length, corredores: seed.brokers.length, segundos: +((Date.now() - t0) / 1000).toFixed(1) };
}

await mock(`/__config?latency=${latency}`);
await mock("/__reset");
const admin = { cookie: `authjs.session-token=${seed.admin}` };
let result;
if (scenario === "calentar") result = await warmUp();
else if (scenario === "backup") result = await once(`/api/superadmin/backup?code=${process.env.ADMIN_BACKUP_CODE}`, admin);
else if (scenario === "cron") result = await once("/api/cron/archive-stale-cases", { authorization: `Bearer ${process.env.CRON_SECRET}` });
else if (sustained[scenario]) result = await runSustained(sustained[scenario]);
else throw new Error(`Escenario desconocido: ${scenario}. Ver la lista al principio de este archivo.`);

console.log(JSON.stringify({ escenario: scenario, concurrencia: conc, latenciaUpstashMs: latency, ...result }));
