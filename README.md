# TORQUE · Inteligencia automotriz

Herramienta de ventas de **carros** para usar **en vivo frente a prospectos** (concesionarios de carros nuevos, usados y de lujo). Pegas los enlaces de los carros (o de un catálogo), describes al cliente, eliges la ciudad y presionas **Analizar carros**. Mientras se procesa, un carro recorre una pista de 0 a 100 %; al llegar a la meta aparece el showroom de resultados:

- Resumen ejecutivo de 3 líneas.
- Tarjetas de producto con foto, precio y características.
- Tabla comparativa lado a lado.
- Puntuación de 0 a 100 de cada producto según el contexto, con pros y contras.
- Precio frente al mercado ("8% por encima del promedio", "Oportunidad").
- "Ideal para": perfil de comprador de cada producto.
- Preguntas que se hace el cliente antes de comprar.
- Investigación de mercado de la ciudad: rangos de precio, factores de decisión y tendencias, con fuentes.
- **Atención y seguimiento**: cada análisis queda ligado a un asesor y a un cliente, se guarda solo y se retoma desde **Clientes**.

---

## 1. Cómo funciona

1. **Entrada.** Pegas un enlace por cajón (al pegar uno aparece el siguiente), describes al cliente (con atajos como "Familia con hijos" o "Busca lujo") y eliges la ciudad. Si un sitio no se deja leer (Mercado Libre y TuCarro suelen bloquear), usas el **Plan B**: pegar el texto de la página o subir el Excel/CSV del inventario.
2. **Procesando.** En pantalla, un carro avanza por una pista de 0 a 100 % con mensajes sencillos ("Revisando el carro…", "Estudiando el mercado…"). Por dentro, el servidor trabaja **en paralelo**:
   - Lee cada enlace con Claude (`claude-sonnet-5-5`) y su herramienta de lectura web (**web fetch**). Si es un catálogo, extrae hasta 12 productos. Cada enlace tiene su propio límite de tiempo: si uno falla, la app sigue con los demás y lo avisa en el registro.
   - Busca la investigación de mercado: primero en `data/market-cache/` (archivos del repositorio), después en la memoria del servidor y, si no la encuentra, la investiga en vivo con la herramienta de **búsqueda web** (web search).
   - El avance llega al navegador en tiempo real (Server-Sent Events). Al llegar al 100 % se revela el resultado completo.
3. **Resultados (showroom).** Arriba, el carro recomendado en grande. Luego el resumen ejecutivo, la vitrina de carros, la comparativa lado a lado, las preguntas del cliente y el mercado de la ciudad con barras de rango de precio. Con los carros y el mercado, Claude genera puntuaciones, pros y contras, perfiles y preguntas. El porcentaje frente al mercado lo calcula la app, no el modelo.

### Cómo se evita inventar datos
- El modelo tiene instrucciones estrictas de usar `null` cuando un dato no aparece. En pantalla se muestra como **"Sin dato"**.
- **Fotos:** solo se muestran las URLs que realmente aparecen en la página leída. Una foto inventada se descarta.
- **Precios:** el precio se verifica contra el contenido leído de la página. Si no aparece ahí, se muestra "Sin dato" y se avisa en el registro.
- Si no se pudo leer nada de una página, sus productos se descartan, para no mostrar productos inventados.
- Cada producto y cada columna llevan su fuente: **E1** = Enlace 1, **TX** = texto pegado, **XL** = inventario.
- Todas las respuestas del modelo se validan con **zod**. Si el JSON viene mal formado, se reintenta automáticamente.

### Identidad visual
- **Nombre:** TORQUE · Inteligencia automotriz.
- **Estilo:** inspirado en los sitios de Porsche, Tesla y Mercedes-Benz: monocromo de lujo (negro, plata y fondo claro tipo showroom) con un solo acento **rojo carreras** (`#C8102E`) y dorado champán para las oportunidades.
- **Tipografía:** Archivo expandida en mayúsculas para títulos, al estilo automotriz, e Inter para el texto.
- **Animación:** escena nocturna con ciudad en movimiento y un carro (dibujado en SVG, sin fotos de terceros) con ruedas girando y faros encendidos.

### Gráficas y análisis
- **Panorama:** carros analizados, precio promedio, diferencia de precio y oportunidades, con números que cuentan al aparecer.
- **Ranking según tu cliente:** barras de puntuación de 0 a 100 (clic para abrir la ficha).
- **Precio frente al mercado:** barras divergentes; champán = por debajo del promedio (oportunidad) y rojo = por encima.
- **Mapa de valor:** precio contra kilometraje; la zona verde es "menos km y menor precio".
- **Ficha de cada carro:** galería, especificaciones con íconos, radar de características (seguridad, confort, desempeño, eficiencia, tecnología y calidad-precio, de 1 a 10), perfil ideal, ventajas y puntos de mejora. Las notas de 1 a 10 son una evaluación estimada por la IA con la ficha y lo que se sabe públicamente del modelo.
- **Comparador frente a frente:** eliges hasta 4 modelos con chips (+ Añadir modelo / ✕) y ves el radar superpuesto (hasta 3) y una tabla con el mejor valor de cada fila en verde.
- Todas las gráficas se animan al entrar en pantalla y muestran el detalle al pasar el mouse.

### Portada con carro real (video, GIF o foto)
La portada muestra un carro real en movimiento. Sube **uno** de estos archivos a la carpeta `public` del repositorio (GitHub → carpeta `public` → **Add file → Upload files** → **Commit changes**):

| Archivo | Qué es | Recomendación |
|---|---|---|
| `hero.mp4` | Video corto en bucle, sin sonido | **El mejor**: se ve más fluido y pesa menos que un GIF. 5–10 s, horizontal, menos de 8 MB. |
| `hero.gif` | GIF animado | Funciona, pero pesa más; ideal menos de 6 MB. |
| `hero.jpg` | Foto fija | Se anima con un zoom lento. |

Dónde conseguirlo con licencia para uso comercial: **Pexels Videos** o **Pixabay Videos** (busca "luxury car", "car night", "car driving") o un video de tu propio concesionario. Pon el carro hacia la derecha: a la izquierda va el texto.

La app busca en orden `hero.mp4` → `hero.gif` → `hero.jpg` → fotos de Unsplash → escena animada del carro, y usa la primera que encuentre.

### Resultados
1. **#1 en el escenario oscuro:** foto grande, precio, puntuación, kilometraje y por qué es el mejor.
2. **🏁 Podio (Top 3)** en tarjetas: foto, precio, año, **kilometraje (siempre: "0 km" si es nuevo o "Sin dato" si la fuente no lo dice)**, transmisión e insights clave (✨ titular, ✅ ventajas, ⚠️ a tener en cuenta).
3. **🧭 Resumen ejecutivo:** por qué cada carro del top 3 quedó en su puesto y un 💡 veredicto para cerrar la venta.
4. **🚗 El resto de la vitrina** en orden de puntaje.
5. **🔬 Análisis a fondo** en pestañas: 📊 Gráficas, ⚖️ Comparar, 📈 Mercado y 💬 Preguntas del cliente.

Al hacer clic en cualquier tarjeta se abre la **vista previa**: carrusel de fotos (flechas, puntos, miniaturas, teclado o deslizando con el dedo), datos, insights, especificaciones, radar y botones para pasar al carro anterior o siguiente.

### Coherencia de los datos
Antes de mostrar un carro, la app revisa y corrige: año válido, kilometraje lógico (y que cuadre con el año), precio dentro de un rango razonable ("98 millones" → $98.000.000), nombres de campos estándar y carros duplicados entre fuentes. Lo que no cuadra se marca con 🔎 "Datos a revisar" en la vista previa.

### Flujo de la atención
1. **Inicio:** se elige el **asesor de venta** (se crean en Admin; el dispositivo recuerda el último usado) y se escriben los **datos del cliente**: nombre (obligatorio), teléfono y correo (opcionales). Si se deja teléfono o correo, es obligatorio marcar que el cliente autorizó el tratamiento de sus datos (Ley 1581 de 2012). **Empezar** se activa solo con asesor y nombre.
2. **Perfil y vehículos:** el formulario de carros, perfil del cliente y ciudad. Arriba se ve "Asesor · Cliente · Guardado hh:mm".
3. **Análisis** con el carro recorriendo la pista.
4. **Resultados**, y al final **Seguimiento**: etapa (Perfilando, Analizado, Seguimiento, Negociación, Venta cerrada, No compró) y notas.

Todo se **guarda automáticamente** (sin botón): datos del cliente, perfil, ciudad, enlaces, resultados, etapa, notas y fechas. Para empezar otra atención se toca el logo TORQUE o **Inicio**.

### Pantallas
| Ruta | Para qué |
|---|---|
| `/login` | Contraseña de acceso (protege toda la app). |
| `/` | Inicio de la atención → perfil y vehículos → análisis → resultados y seguimiento. Con `?atencion=…` retoma una atención guardada. |
| `/clientes` | Todas las atenciones con buscador y filtros por asesor, etapa y fecha. Al abrir una se retoma donde quedó. |
| `/admin` | **Asesores** (crear, editar, activar/desactivar) y **Datos de mercado** (caché por ciudad). |

### Sistema visual
Minimalista y sobrio: negro profundo, blancos y grises cálidos, y un solo acento (rojo TORQUE) para la acción principal, los estados activos y los datos destacados. Títulos en Archivo, textos en Inter, cifras tabulares, íconos de línea Lucide. Colores, radios, sombras, tipografía y tiempos de transición están definidos como variables en `app/globals.css`.

---

## 2. Desplegar en Vercel (paso a paso, sin instalar nada)

> Necesitas: una cuenta de GitHub con este repositorio, una cuenta de Vercel y una API key de Anthropic.

### Paso A: conseguir la API key de Anthropic
1. Entra a **https://console.anthropic.com** e inicia sesión.
2. En el menú, ve a **API Keys** → **Create Key**. Ponle un nombre (por ejemplo, "torque-vercel").
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

### Paso C2: conectar la base de datos (para guardar clientes y asesores)
Sin este paso la app funciona, pero lo guardado se borra cuando Vercel reinicia el servidor (verás el aviso "Guardado temporal").
1. En Vercel, abre el proyecto → pestaña **Storage** → **Create Database** (o **Connect Database**).
2. Elige **Upstash** → **Redis** (plan gratuito) → región **Washington, D.C. (us-east-1)** o la más cercana → **Create**.
3. Cuando pregunte a qué proyecto conectarla, elige este proyecto y deja marcados todos los entornos → **Connect**. Vercel agrega solo las variables (`KV_REST_API_URL` y `KV_REST_API_TOKEN`); no tienes que copiar nada.
4. Ve a **Deployments** → **⋯** del último → **Redeploy**.
5. Entra a **Admin → Asesores** y crea a tus asesores. Desde ahí, todo queda guardado de forma permanente.

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
2. Presiona **Generar todas (4)**, o **Generar** en una sola ciudad. Verás el proceso y luego el resultado. Revísalo.
3. Presiona **Descargar las listas** (o **⤓ JSON** en cada tarjeta). Los archivos se llaman `carros-medellin.json`, `carros-bogota.json`, `carros-cali.json` y `carros-barranquilla.json`. **No les cambies el nombre.**
4. Súbelos a GitHub desde el navegador:
   1. Abre el repositorio en github.com y entra a la carpeta `data` → `market-cache`.
   2. Presiona **Add file → Upload files** y arrastra los JSON.
   3. Abajo, presiona **Commit changes**.
5. Vercel despliega solo en 1 o 2 minutos. A partir de ese momento, el registro dirá "Investigación de mercado cargada desde la caché del repositorio".

Recomendación: regenera la caché una vez al mes para mantener los precios al día.

Si usas una ciudad sin archivo de caché, la app la investiga en vivo y la guarda en memoria mientras el servidor siga activo. En Vercel esa memoria dura poco, porque los servidores se apagan cuando no se usan.

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

## 5. Para desarrolladores

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
  login/, admin/, clientes/
  api/process/route.ts   Pipeline principal (SSE): enlaces ∥ mercado → insights
  api/asesores, api/clientes   Asesores y atenciones (guardado automático)
  api/market/route.ts    Investigación de mercado (usada por /admin)
  api/login, api/logout  Sesión por cookie
proxy.ts                 Protección con contraseña (en Next.js 16, "middleware" se llama "proxy")
lib/
  claude.ts              Cliente de Anthropic, herramientas web, validación zod y reintentos
  extract.ts             Extracción de productos + verificación de fotos y precios
  hints.ts               Lectura directa del HTML (og:image, JSON-LD) como pistas
  market.ts              Caché (repositorio → memoria → en vivo)
  insights.ts            Puntuaciones, precio vs. mercado
  db.ts, crm.ts          Base de datos (Upstash Redis o memoria) y esquemas de asesores/atenciones
  coherencia.ts          Revisión de datos (año, km, precio, duplicados)
  schemas.ts             Esquemas zod y tipos
components/              Interfaz (inicio, formulario, tarjetas, vista previa, gráficas…)
data/market-cache/       JSON de mercado precalculados
```

Notas técnicas:
- Modelo `claude-sonnet-5-5`, con las herramientas de servidor `web_search_20260209` y `web_fetch_20260209`, esfuerzo `low` para priorizar la velocidad en vivo y reanudación automática si la API pausa el turno (`pause_turn`).
- Está activado el *fallback* del lado del servidor (`fallbacks: "default"`): si un filtro de seguridad rechaza una petición por error, la API la reintenta con otro modelo. Para desactivarlo, quita `fallbacks` y `betas` en `lib/claude.ts`.
- Costos: cada análisis usa varias llamadas al modelo y algunas búsquedas web (la búsqueda web se cobra por uso, además de los tokens). La caché de mercado reduce el costo y el tiempo.
