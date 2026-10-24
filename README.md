# Expertize Insights

Herramienta de ventas para usar **en vivo frente a prospectos** (concesionarios, inmobiliarias, constructoras, ventas de motos). Pegas enlaces de productos (o un catálogo), escribes el contexto del cliente, presionas **Procesar** y en menos de 90 segundos ves:

- Resumen ejecutivo de 3 líneas.
- Tarjetas de producto con foto, precio y características.
- Tabla comparativa lado a lado.
- Puntuación de 0 a 100 de cada producto según el contexto, con pros y contras.
- Precio frente al mercado ("8% por encima del promedio", "Oportunidad").
- "Ideal para": perfil de comprador de cada producto.
- Preguntas que se hace el cliente antes de comprar.
- Investigación de mercado de la ciudad: rangos de precio, factores de decisión y tendencias, con fuentes.
- **"Así lo vería tu cliente"**: un comparador para el comprador final, con tu marca y tu color, que puedes descargar como JSON y reutilizar.

---

## 1. Cómo funciona

1. **Entrada.** Pegas los enlaces (uno por línea), el contexto, la industria y la ciudad. Si un sitio no se deja leer, usas el **Plan B**: pegar el texto a mano o subir el Excel/CSV del inventario.
2. **Procesando.** El servidor trabaja **en paralelo**:
   - Lee cada enlace con Claude (`claude-sonnet-5-5`) y su herramienta de lectura web (**web fetch**). Si es un catálogo, extrae hasta 12 productos. Cada enlace tiene su propio límite de tiempo: si uno falla, la app sigue con los demás y lo avisa en el registro.
   - Busca la investigación de mercado: primero en `data/market-cache/` (archivos del repositorio), después en la memoria del servidor y, si no la encuentra, la investiga en vivo con la herramienta de **búsqueda web** (web search).
   - El registro estilo terminal muestra cada paso en tiempo real (Server-Sent Events), y cada producto aparece en pantalla apenas se lee.
3. **Insights.** Con los productos y el mercado, Claude genera puntuaciones, pros y contras, perfiles y preguntas. El porcentaje frente al mercado lo calcula la app, no el modelo.

### Cómo se evita inventar datos
- El modelo tiene instrucciones estrictas de usar `null` cuando un dato no aparece. En pantalla se muestra como **"Sin dato"**.
- **Fotos:** solo se muestran las URLs que realmente aparecen en la página leída. Una foto inventada se descarta.
- **Precios:** el precio se verifica contra el contenido leído de la página. Si no aparece ahí, se muestra "Sin dato" y se avisa en el registro.
- Si no se pudo leer nada de una página, sus productos se descartan, para no mostrar productos inventados.
- Cada producto y cada columna llevan su fuente: **E1** = Enlace 1, **TX** = texto pegado, **XL** = inventario.
- Todas las respuestas del modelo se validan con **zod**. Si el JSON viene mal formado, se reintenta automáticamente.

### Pantallas
| Ruta | Para qué |
|---|---|
| `/login` | Contraseña de acceso (protege toda la app). |
| `/` | Entrada → procesamiento en vivo → insights → "Así lo vería tu cliente". |
| `/admin` | Genera y descarga la caché de mercado (Carros, Motos, Vivienda venta, Vivienda arriendo × Medellín, Bogotá). |
| `/comparador` | Abre un comparador guardado (el JSON que descargaste) para mostrarlo de nuevo a otro cliente. |

---

## 2. Desplegar en Vercel (paso a paso, sin instalar nada)

> Necesitas: una cuenta de GitHub con este repositorio, una cuenta de Vercel y una API key de Anthropic.

### Paso A: conseguir la API key de Anthropic
1. Entra a **https://console.anthropic.com** e inicia sesión.
2. En el menú, ve a **API Keys** → **Create Key**. Ponle un nombre (por ejemplo, "Expertize Insights").
3. Copia la clave (empieza por `sk-ant-…`). Guárdala en un lugar seguro: solo se muestra una vez.
4. En **Billing**, carga saldo. Cada análisis consume tokens y búsquedas web.

### Paso B: conectar el repositorio con Vercel
1. Entra a **https://vercel.com** y elige **Continue with GitHub**.
2. Presiona **Add New… → Project**.
3. En la lista de repositorios, busca este repositorio y presiona **Import**. Si no aparece, haz clic en **Adjust GitHub App Permissions** y dale acceso a Vercel.
4. Vercel detecta solo que es **Next.js**. No cambies nada de "Build" ni de "Output".

### Paso C: cargar las variables de entorno
En esa misma pantalla, antes de desplegar, abre la sección **Environment Variables** y agrega estas dos:

| Name (nombre) | Value (valor) |
|---|---|
| `ANTHROPIC_API_KEY` | la clave que copiaste en el Paso A (`sk-ant-…`) |
| `APP_PASSWORD` | la contraseña que usarás para entrar a la app (elige una larga) |

Luego presiona **Deploy**. En 1 o 2 minutos tendrás una dirección como `https://expertize-insights.vercel.app`.

**¿Y si después quiero cambiarlas?** Entra al proyecto en Vercel → **Settings** → **Environment Variables**, edita el valor y guarda. Después ve a **Deployments**, abre el menú `⋯` del último despliegue y elige **Redeploy**: los cambios solo se aplican al volver a desplegar. Si cambias `APP_PASSWORD`, todas las sesiones abiertas se cierran.

> Nunca escribas las claves dentro del código ni en GitHub. El archivo `.env.example` solo muestra los nombres.

### Paso D: probar
Abre la dirección de Vercel, escribe tu contraseña y haz un análisis de prueba con 2 enlaces.

### ¿Mi plan de Vercel tiene límites que afecten esto?
Las rutas que procesan (`/api/process` y `/api/market`) están configuradas con `maxDuration = 300` (5 minutos), más que suficiente para procesos de 2 minutos.

- **Plan Hobby (gratis):** con *Fluid Compute*, que viene activado por defecto en los proyectos nuevos, las funciones pueden durar hasta **300 segundos**, así que la app funciona. Pero **el plan Hobby es solo para uso personal y no comercial**. Como vas a usar la app para vender, Vercel exige el plan Pro.
- **Plan Pro (pago):** permite hasta 800 segundos y está autorizado para uso comercial. **Es el recomendado.**
- Si alguna vez ves el error "Function timed out", revisa en **Settings → Functions** que *Fluid Compute* esté activado.
- La optimización de imágenes de Vercel tiene un cupo mensual según el plan. Si se agota, la app muestra la foto original sin optimizar.
- Límites actualizados: https://vercel.com/docs/functions/limitations

---

## 3. Generar y subir la caché de mercado

Con la caché, la investigación de mercado se carga al instante en vez de tardar entre 30 y 60 segundos en vivo. Ideal para tener todo listo antes de una reunión.

1. Entra a `https://TU-APP.vercel.app/admin`.
2. Presiona **Generar todas (8)**, o **Generar** en una sola combinación. Verás el registro en vivo y luego el resultado. Revísalo.
3. Presiona **⤓ Descargar todas las listas** (o **⤓ JSON** en cada tarjeta). Los archivos se llaman, por ejemplo, `carros-medellin.json`, `vivienda-venta-bogota.json`, etc. **No les cambies el nombre.**
4. Súbelos a GitHub desde el navegador:
   1. Abre el repositorio en github.com y entra a la carpeta `data` → `market-cache`.
   2. Presiona **Add file → Upload files** y arrastra los JSON.
   3. Abajo, presiona **Commit changes**.
5. Vercel despliega solo en 1 o 2 minutos. A partir de ese momento, el registro dirá "Investigación de mercado cargada desde la caché del repositorio".

Recomendación: regenera la caché una vez al mes para mantener los precios al día.

Si usas una ciudad o industria sin archivo de caché, la app la investiga en vivo y la guarda en memoria mientras el servidor siga activo. En Vercel esa memoria dura poco, porque los servidores se apagan cuando no se usan.

---

## 4. Conectar un subdominio (por ejemplo `insights.tuempresa.com`)

1. En Vercel, abre el proyecto → **Settings** → **Domains**.
2. Escribe `insights.tuempresa.com` y presiona **Add**.
3. Vercel te mostrará un registro DNS para crear, normalmente de tipo **CNAME**, con nombre `insights` y un valor que termina en `vercel-dns.com`. Copia exactamente el valor que te muestre.
4. Entra al panel donde compraste el dominio (GoDaddy, Namecheap, Cloudflare, etc.) → **DNS** → **Agregar registro**:
   - Tipo: `CNAME`
   - Nombre/Host: `insights`
   - Valor/Destino: el que te dio Vercel
5. Guarda. En unos minutos (a veces hasta unas horas), Vercel mostrará el dominio como **Valid** y activará el HTTPS solo.
6. Si usas Cloudflare, deja el registro en modo **DNS only** (nube gris) mientras se valida.

---

## 5. El comparador "Así lo vería tu cliente"

- Se genera automáticamente con los productos del análisis: tiene preguntas guiadas (presupuesto, uso, preferencias) y muestra los resultados ordenados por coincidencia, con fotos y una comparación lado a lado.
- Desde la pantalla puedes cambiar **el nombre de la marca, el color principal y el logo** (una URL de imagen).
- **⤓ Descargar JSON** guarda toda la configuración: marca, colores, preguntas, reglas de puntuación y catálogo. Para reutilizarla, entra a `/comparador` y carga ese archivo.
- Reglas de puntuación (en el JSON, bajo `reglas`): se parte de la puntuación del análisis, se suman los puntos de cada respuesta (de −20 a +20 por producto), se agrega un bono si el producto está dentro del presupuesto y se resta una penalización por cada 1% que lo supere. El resultado se limita de 0 a 100.

---

## 6. Para desarrolladores

```bash
npm install
cp .env.example .env.local   # y completa las claves
npm run dev                  # http://localhost:3000
npm run build                # compilación de producción
```

Estructura:
```
app/
  page.tsx               Pantalla principal (componente App)
  login/, admin/, comparador/
  api/process/route.ts   Pipeline principal (SSE): enlaces ∥ mercado → insights + comparador
  api/market/route.ts    Investigación de mercado (usada por /admin)
  api/login, api/logout  Sesión por cookie
proxy.ts                 Protección con contraseña (en Next.js 16, "middleware" se llama "proxy")
lib/
  claude.ts              Cliente de Anthropic, herramientas web, validación zod y reintentos
  extract.ts             Extracción de productos + verificación de fotos y precios
  hints.ts               Lectura directa del HTML (og:image, JSON-LD) como pistas
  market.ts              Caché (repositorio → memoria → en vivo)
  insights.ts            Puntuaciones, precio vs. mercado y comparador
  schemas.ts             Esquemas zod y tipos
components/              Interfaz (terminal, tarjetas, tabla, comparador…)
data/market-cache/       JSON de mercado precalculados
```

Notas técnicas:
- Modelo `claude-sonnet-5-5`, con las herramientas de servidor `web_search_20260209` y `web_fetch_20260209`, esfuerzo `low` para priorizar la velocidad en vivo y reanudación automática si la API pausa el turno (`pause_turn`).
- Está activado el *fallback* del lado del servidor (`fallbacks: "default"`): si un filtro de seguridad rechaza una petición por error, la API la reintenta con otro modelo. Para desactivarlo, quita `fallbacks` y `betas` en `lib/claude.ts`.
- Costos: cada análisis usa varias llamadas al modelo y algunas búsquedas web (la búsqueda web se cobra por uso, además de los tokens). La caché de mercado reduce el costo y el tiempo.
