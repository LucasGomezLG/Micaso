// Servidor falso de Upstash Redis (API REST) para las pruebas de carga
// locales — ver README.md de esta carpeta. Nunca toca la base real.
//
// Implementa solo lo que usa lib/db.ts (GET, SET con NX/EX/PX, DEL, MGET,
// INCR, EXPIRE, EXISTS, TTL, PING) por "/", "/pipeline" y "/multi-exec", con
// respuestas en base64 como las pide @upstash/redis. Guarda todo en memoria,
// simula la latencia de red por pedido HTTP y cuenta comandos, pedidos,
// reintentos del lock de dbUpdate (SET NX fallidos sobre claves ":lock") y
// tamaños de respuesta.
//
// Endpoints de control: /__stats, /__reset, /__flush, /__config?latency=N,
// /__load (POST {clave: valor}) y /__get?key=K.
import http from "node:http";

const PORT = Number(process.env.PORT || 8079);
let latencyMs = Number(process.env.LATENCY_MS || 0);

/** @type {Map<string, { v: string, exp: number | null }>} */
const data = new Map();

function freshStats() {
  return {
    httpRequests: 0,
    pipelineRequests: 0,
    commands: 0,
    byCommand: {},
    lockSpinsFailed: 0,
    maxResponseBytes: 0,
    maxResponseCommand: null,
    responseBytes: 0,
    requestBytes: 0,
    maxRequestBytes: 0,
    maxInFlight: 0,
  };
}
let stats = freshStats();
let inFlight = 0;

function alive(key) {
  const entry = data.get(key);
  if (!entry) return null;
  if (entry.exp !== null && entry.exp <= Date.now()) {
    data.delete(key);
    return null;
  }
  return entry;
}

function exec(parts) {
  const cmd = String(parts[0]).toLowerCase();
  const args = parts.slice(1).map((a) => (typeof a === "string" ? a : JSON.stringify(a)));
  stats.commands++;
  stats.byCommand[cmd] = (stats.byCommand[cmd] || 0) + 1;
  switch (cmd) {
    case "ping":
      return "PONG";
    case "get":
      return alive(args[0])?.v ?? null;
    case "set": {
      const [key, value, ...opts] = args;
      let nx = false;
      let xx = false;
      let exp = null;
      for (let i = 0; i < opts.length; i++) {
        const o = opts[i].toLowerCase();
        if (o === "nx") nx = true;
        else if (o === "xx") xx = true;
        else if (o === "ex") exp = Date.now() + Number(opts[++i]) * 1000;
        else if (o === "px") exp = Date.now() + Number(opts[++i]);
      }
      const exists = alive(key) !== null;
      if (nx && exists) {
        if (key.endsWith(":lock")) stats.lockSpinsFailed++;
        return null;
      }
      if (xx && !exists) return null;
      data.set(key, { v: value, exp });
      return "OK";
    }
    case "del":
      return args.filter((k) => alive(k) && data.delete(k)).length;
    case "exists":
      return args.filter((k) => alive(k)).length;
    case "mget":
      return args.map((k) => alive(k)?.v ?? null);
    case "incr": {
      const entry = alive(args[0]);
      const n = (entry ? Number(entry.v) : 0) + 1;
      data.set(args[0], { v: String(n), exp: entry ? entry.exp : null });
      return n;
    }
    case "expire": {
      const entry = alive(args[0]);
      if (!entry) return 0;
      if ((args[2] || "").toLowerCase() === "nx" && entry.exp !== null) return 0;
      entry.exp = Date.now() + Number(args[1]) * 1000;
      return 1;
    }
    case "ttl": {
      const entry = alive(args[0]);
      if (!entry) return -2;
      return entry.exp === null ? -1 : Math.ceil((entry.exp - Date.now()) / 1000);
    }
    default:
      throw new Error(`ERR comando no soportado por el mock: ${cmd}`);
  }
}

const toBase64 = (s) => Buffer.from(s, "utf8").toString("base64");
function encode(result) {
  if (typeof result === "string") return result === "OK" ? "OK" : toBase64(result);
  if (Array.isArray(result)) return result.map((v) => (typeof v === "string" ? toBase64(v) : v));
  return result;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function send(res, status, obj, label) {
  const body = JSON.stringify(obj);
  const bytes = Buffer.byteLength(body);
  stats.responseBytes += bytes;
  if (bytes > stats.maxResponseBytes) {
    stats.maxResponseBytes = bytes;
    stats.maxResponseCommand = label;
  }
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://mock");
  switch (url.pathname) {
    case "/__stats":
      return send(res, 200, { ...stats, keys: data.size, latencyMs }, "__stats");
    case "/__reset":
      stats = freshStats();
      return send(res, 200, { ok: true }, "__reset");
    case "/__flush":
      data.clear();
      stats = freshStats();
      return send(res, 200, { ok: true }, "__flush");
    case "/__config":
      if (url.searchParams.has("latency")) latencyMs = Number(url.searchParams.get("latency"));
      return send(res, 200, { latencyMs }, "__config");
    case "/__load": {
      const map = JSON.parse(await readBody(req));
      for (const [k, v] of Object.entries(map)) data.set(k, { v: typeof v === "string" ? v : JSON.stringify(v), exp: null });
      return send(res, 200, { loaded: Object.keys(map).length }, "__load");
    }
    case "/__get":
      return send(res, 200, { value: alive(url.searchParams.get("key"))?.v ?? null }, "__get");
  }

  inFlight++;
  stats.maxInFlight = Math.max(stats.maxInFlight, inFlight);
  const raw = await readBody(req);
  const reqBytes = Buffer.byteLength(raw);
  stats.requestBytes += reqBytes;
  stats.maxRequestBytes = Math.max(stats.maxRequestBytes, reqBytes);
  stats.httpRequests++;
  const base64 = String(req.headers["upstash-encoding"] || "").toLowerCase() === "base64";
  if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs));
  try {
    const body = JSON.parse(raw);
    if (url.pathname.endsWith("/pipeline") || url.pathname.endsWith("/multi-exec")) {
      stats.pipelineRequests++;
      const out = body.map((parts) => {
        try {
          const result = exec(parts);
          return { result: base64 ? encode(result) : result };
        } catch (e) {
          return { error: e.message };
        }
      });
      send(res, 200, out, `pipeline(${body.map((p) => p[0]).join(",")})`);
    } else {
      const result = exec(body);
      send(res, 200, { result: base64 ? encode(result) : result }, String(body[0]));
    }
  } catch (e) {
    send(res, 400, { error: e.message }, "error");
  } finally {
    inFlight--;
  }
});

server.keepAliveTimeout = 65_000;
server.listen(PORT, "127.0.0.1", () => console.log(`mock-upstash en http://127.0.0.1:${PORT} (latencia ${latencyMs} ms)`));
