/**
 * Lectura directa y rápida del HTML de un enlace para obtener "pistas" que la
 * herramienta web_fetch no siempre conserva: fotos (og:image, JSON-LD, <img>)
 * y datos estructurados de producto (schema.org). Si el sitio bloquea la
 * lectura, simplemente no hay pistas y el modelo trabaja solo con web_fetch.
 */

export type Pistas = {
  titulo: string | null;
  imagenes: string[];
  jsonLd: string[];
  texto: string;
};

const PRIVADO = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)/i;

export function urlValida(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (PRIVADO.test(u.hostname) || u.hostname.endsWith(".local") || u.hostname.endsWith(".internal")) {
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluta(src: string, base: URL): string | null {
  try {
    const u = new URL(decode(src.trim()), base);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const NO_FOTO = /(logo|icon|sprite|favicon|avatar|placeholder|blank|pixel|tracking|badge|flag|banner-app|\.svg($|\?))/i;

export async function obtenerPistas(url: string, timeoutMs = 7000): Promise<Pistas | null> {
  const base = urlValida(url);
  if (!base) return null;
  try {
    const res = await fetch(base, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "es-CO,es;q=0.9",
      },
    });
    if (!res.ok) return null;
    const tipo = res.headers.get("content-type") ?? "";
    if (!tipo.includes("html")) return null;
    const html = (await res.text()).slice(0, 2_000_000);

    const imagenes = new Set<string>();
    const add = (src: string | undefined) => {
      if (!src) return;
      const abs = absoluta(src, base);
      if (abs && !NO_FOTO.test(abs)) imagenes.add(abs);
    };

    for (const m of html.matchAll(
      /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi,
    )) {
      add(m[0].match(/content=["']([^"']+)["']/i)?.[1]);
    }

    const jsonLd: string[] = [];
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      const raw = m[1].trim();
      if (/product|offer|vehicle|car|residence|house|apartment|realestate|itemlist|accommodation/i.test(raw)) {
        jsonLd.push(raw.slice(0, 8000));
        for (const img of raw.matchAll(/"(?:image|contentUrl|url)"\s*:\s*"([^"]+\.(?:jpe?g|png|webp|avif)[^"]*)"/gi)) {
          add(img[1].replace(/\\\//g, "/"));
        }
      }
    }

    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      if (imagenes.size >= 40) break;
      const tag = m[0];
      const src =
        tag.match(/\sdata-src=["']([^"']+)["']/i)?.[1] ??
        tag.match(/\sdata-lazy-src=["']([^"']+)["']/i)?.[1] ??
        tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ??
        tag.match(/\ssrcset=["']([^"'\s]+)/i)?.[1];
      if (src && !src.startsWith("data:")) add(src);
    }

    const titulo = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "") || null;

    const texto = decode(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    ).slice(0, 12_000);

    return { titulo, imagenes: [...imagenes].slice(0, 40), jsonLd: jsonLd.slice(0, 4), texto };
  } catch {
    return null;
  }
}
