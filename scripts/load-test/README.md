# Prueba de carga local

Herramientas para repetir las mediciones de `AUDITORIA-CARGA-2026-09-25.md`
(por ejemplo, después de arreglar algo de ese informe) **sin tocar
producción**.

La app corre en local con el build de producción. En lugar de Upstash usa
`mock-upstash.mjs`, un servidor que habla el mismo protocolo REST, guarda
todo en memoria, simula la latencia de red y cuenta cada comando. Lo que
se mide es lo que no depende de la máquina: comandos por acción, datos
movidos, comportamiento del lock con concurrencia y límites de tamaño. Los
pedidos por segundo son los de una sola instancia; Vercel suma instancias
solo.

> **Nunca apuntar esto a producción ni a un preview que use la base de
> producción.** Los scripts se niegan a correr si Upstash o la app no son
> locales, y `env.sh` pisa las variables de `.env.local` con valores de
> prueba.

## Archivos

| Archivo | Qué hace |
|---|---|
| `env.sh` | Carga las variables de la prueba: Upstash apunta al mock y los secretos son de prueba, generados una vez en `out/`. |
| `mock-upstash.mjs` | El servidor falso de Upstash (puerto 8079). Endpoints de control: `/__stats`, `/__reset`, `/__flush`, `/__config?latency=N`. |
| `seed.mts` | Carga corredores y casos con el código real de la app, y casas de tamaño realista. Guarda las cookies de sesión en `out/seed.json`. |
| `loadtest.mjs` | Corre un escenario contra la app y resume latencias, errores, comandos por pedido y reintentos del lock. |

`out/` está en `.gitignore`.

## Pasos

Hay que usar Git Bash, desde la raíz del repo, con una terminal por
proceso y **`source scripts/load-test/env.sh` en cada una**.

```bash
# 1. Build de producción (una vez, o después de cambiar código)
npm run build

# 2. Terminal A: el mock de Upstash
source scripts/load-test/env.sh
node scripts/load-test/mock-upstash.mjs

# 3. Terminal B: la app en modo producción, contra el mock
source scripts/load-test/env.sh
npx next start -p 3100

# 4. Terminal C: sembrar, calentar y medir
source scripts/load-test/env.sh
node --import tsx scripts/load-test/seed.mts 50 20 40     # corredores, casos por corredor, casas por caso
node scripts/load-test/loadtest.mjs calentar
node scripts/load-test/loadtest.mjs familia-casas 10 15 2 # escenario, concurrencia, segundos, latencia de Upstash en ms
```

Para empezar de cero: `curl -X POST http://127.0.0.1:8079/__flush` y
volver a sembrar.

## Escenarios

| Escenario | Qué simula |
|---|---|
| `familia-casas` / `familia-agenda` | Familias navegando casos distintos. |
| `familia-comenta-distintos` | Escrituras en casos distintos (no compiten entre sí). |
| `familia-comenta-mismo-caso` | Escrituras sobre el mismo caso, para ver el lock de `dbUpdate`. |
| `corredor-panel` | Corredores distintos abriendo `/panel`. |
| `corredor-panel-mismo` | El mismo corredor con pedidos en paralelo (el lock de `getCurrentBroker`). |
| `alta-casos` | Altas de casos simultáneas (el lock global de `all_case_ids`). |
| `calentar` | Una pasada por cada caso y cada panel. Correrla antes de medir. |
| `backup` / `cron` | Una sola llamada, que mide el tamaño y el tiempo. |

Latencias de referencia: **2 ms** si las funciones y Upstash están en la
misma región, y **30 ms** si están en regiones distintas.

Después de `alta-casos` conviene revisar si quedaron casos a medio crear
(en `broker:{id}:cases` pero no en `all_case_ids`) con `/__get?key=…`.
Así se detectó CARGA-02.

## Resultados de referencia (25 sept 2026, `main` en `0737695`)

Con 50 corredores × 20 casos × 40 casas:

| Escenario | Resultado |
|---|---|
| `familia-casas` | 5 comandos por vista y ~40 vistas/s por instancia (2 ms). |
| `corredor-panel` | 28 comandos y 2,3 MB desde Upstash por vista. |
| `alta-casos` con 20 simultáneas | Entre el 3% y el 8% de errores por el lock, y un caso a medio crear por cada error. |
| `backup` con 1.000 casos | Respuesta de 124,5 MB, cuando Vercel corta en 4,5 MB. |

Detalle completo en `AUDITORIA-CARGA-2026-09-25.md`.
