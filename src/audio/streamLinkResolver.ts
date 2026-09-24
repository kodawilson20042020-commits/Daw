/**
 * Turns a pasted share link into a fetchable audio URL.
 *
 * Spotify / Apple Music / Deezer: the platform's own 30-second preview file.
 * YouTube, SoundCloud, TikTok, Tidal, Amazon, Bandcamp: public title, then the
 * closest official store preview (never a full-stream rip).
 * Direct audio URLs (.mp3, .wav, …) pass through unchanged.
 */

export type LinkSource =
  | "direct"
  | "youtube"
  | "spotify"
  | "soundcloud"
  | "apple"
  | "deezer"
  | "tidal"
  | "bandcamp"
  | "amazon"
  | "tiktok"
  | "unknown";

export type AudioKind = "file" | "preview" | "none";

export type ResolveResult = {
  ok: boolean;
  inputUrl: string;
  canonicalUrl: string;
  source: LinkSource;
  title: string;
  artist: string;
  thumbnail: string | null;
  audioUrl: string | null;
  fallbackAudioUrl: string | null;
  kind: AudioKind;
  durationHint: number | null;
  note: string;
  error?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const AUDIO_EXT = /\.(mp3|wav|wave|ogg|oga|flac|aac|m4a|aiff|aif|opus|caf)(?=$|[?#])/i;

const cache = new Map<string, { at: number; value: ResolveResult }>();
const CACHE_MS = 10 * 60 * 1000;

type PreviewHit = {
  audioUrl: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  duration: number | null;
  score: number;
};

export function extractUrl(input: string): string | null {
  const text = (input || "").trim();
  if (!text) return null;
  const found = text.match(/https?:\/\/[^\s<>"']+/i);
  if (found) return found[0].replace(/[),.;]+$/, "");
  const uri = text.match(/spotify:(track|album|playlist|episode):[A-Za-z0-9]+/i);
  if (uri) return uri[0];
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(text) && !text.includes(" ")) {
    return `https://${text}`;
  }
  return null;
}

export function classifyLink(raw: string): { source: LinkSource; url: URL | null; spotifyId?: string } {
  const spotifyUri = raw.match(/^spotify:(track|album|playlist|episode):([A-Za-z0-9]+)/i);
  if (spotifyUri) {
    const kind = spotifyUri[1].toLowerCase();
    const id = spotifyUri[2];
    return {
      source: "spotify",
      url: new URL(`https://open.spotify.com/${kind}/${id}`),
      spotifyId: kind === "track" ? id : undefined,
    };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { source: "unknown", url: null };
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    return { source: "youtube", url };
  }
  if (host.endsWith("spotify.com") || host === "spotify.link" || host === "spotify.app.link") {
    const id = url.pathname.match(/\/track\/([A-Za-z0-9]+)/)?.[1];
    return { source: "spotify", url, spotifyId: id };
  }
  if (host.endsWith("soundcloud.com") || host === "snd.sc" || host === "on.soundcloud.com") {
    return { source: "soundcloud", url };
  }
  if (host.endsWith("apple.com") && (host.includes("music.") || host.includes("itunes."))) {
    return { source: "apple", url };
  }
  if (host.endsWith("deezer.com") || host === "deezer.page.link" || host === "dzr.page.link") {
    return { source: "deezer", url };
  }
  if (host.endsWith("tidal.com")) return { source: "tidal", url };
  if (host.endsWith("bandcamp.com")) return { source: "bandcamp", url };
  if (host.includes("music.amazon.") || host === "amazon.com" || host.endsWith(".amazon.com")) {
    if (host.includes("music.") || url.pathname.includes("/music") || host.startsWith("music.")) {
      return { source: "amazon", url };
    }
  }
  if (host.endsWith("tiktok.com")) return { source: "tiktok", url };
  if (AUDIO_EXT.test(url.pathname) || host === "p.scdn.co" || host.endsWith("dzcdn.net") || host.includes("itunes.apple.com") || host.includes("audio-ssl.itunes")) {
    return { source: "direct", url };
  }
  return { source: "unknown", url };
}

function isShortHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return [
    "spotify.link",
    "spotify.app.link",
    "on.soundcloud.com",
    "snd.sc",
    "deezer.page.link",
    "dzr.page.link",
    "apple.co",
    "youtu.be",
  ].includes(host);
}

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host === "0.0.0.0") {
    return true;
  }
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return true;
    }
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  return false;
}

function cleanTitle(raw: string): { artist: string; title: string } {
  let s = raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/\s+[-|–—]\s+/g, " - ");
  const parts = s.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { artist: stripJunk(parts[0]), title: stripJunk(parts.slice(1).join(" - ")) };
  }
  return { artist: "", title: stripJunk(s) };
}

function stripJunk(s: string): string {
  return s
    .replace(/\b(official\s+(music\s+)?video|official\s+audio|lyrics?|visuali[sz]er|remaster(?:ed)?|hd|4k|mv|music\s+video|audio)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreMatch(query: string, title: string, artist: string): number {
  const q = norm(query);
  const titleN = norm(title);
  const blob = norm(`${artist} ${title}`);
  if (!q || !blob) return 0;
  const qTokens = q.split(" ").filter((w) => w.length > 1);
  const blobTokens = new Set(blob.split(" "));
  if (qTokens.length === 0) return 0;
  let hit = 0;
  for (const w of qTokens) if (blobTokens.has(w)) hit += 1;
  let score = hit / qTokens.length;
  if (blob === q || titleN === q) score = 1;
  const extras = blob.split(" ").filter((w) => w.length > 2 && !qTokens.includes(w));
  score -= Math.min(0.35, extras.length * 0.07);
  const version = /\b(remix|mix|pianoforte|karaoke|tribute|cover|instrumental|live|acoustic|edit|version|remaster|nightcore|sped|slowed)\b/i;
  if (version.test(title) && !version.test(query)) score -= 0.5;
  return Math.max(0, Math.min(1, score));
}

async function fetchJson(url: string, ms = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*" },
      signal: AbortSignal.timeout(ms),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchText(url: string, ms = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(ms),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 400_000);
  } catch {
    return null;
  }
}

async function expandShort(raw: string): Promise<string> {
  let current = raw;
  for (let i = 0; i < 4; i += 1) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      break;
    }
    if (!isShortHost(url.hostname) || isBlockedHost(url.hostname)) break;
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      });
      const loc = res.headers.get("location");
      if (!loc) break;
      current = new URL(loc, current).toString();
    } catch {
      break;
    }
  }
  return current;
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }
  const v = url.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;
  const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
  return m ? m[1] : null;
}

function appleTrackId(url: URL): string | null {
  const i = url.searchParams.get("i");
  if (i && /^\d+$/.test(i)) return i;
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (/^\d+$/.test(last) && (parts.includes("song") || parts.includes("album"))) return last;
  return null;
}

function deezerTrackId(url: URL): string | null {
  const m = url.pathname.match(/\/track\/(\d+)/);
  return m ? m[1] : null;
}

async function searchPreviews(query: string): Promise<PreviewHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const [deezerRaw, itunesRaw] = await Promise.all([
    fetchJson(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=12`),
    fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8`),
  ]);
  const hits: PreviewHit[] = [];
  const deezer = deezerRaw as { data?: Array<Record<string, unknown>> } | null;
  for (const row of deezer?.data || []) {
    const audioUrl = typeof row.preview === "string" ? row.preview : "";
    const title = typeof row.title === "string" ? row.title : "";
    const artistObj = row.artist as { name?: string } | undefined;
    const artist = typeof artistObj?.name === "string" ? artistObj.name : "";
    const album = row.album as { cover_medium?: string } | undefined;
    if (!audioUrl || !title) continue;
    hits.push({
      audioUrl,
      title,
      artist,
      thumbnail: typeof album?.cover_medium === "string" ? album.cover_medium : null,
      duration: 30,
      score: scoreMatch(q, title, artist),
    });
  }
  const itunes = itunesRaw as { results?: Array<Record<string, unknown>> } | null;
  for (const row of itunes?.results || []) {
    const audioUrl = typeof row.previewUrl === "string" ? row.previewUrl : "";
    const title = typeof row.trackName === "string" ? row.trackName : "";
    const artist = typeof row.artistName === "string" ? row.artistName : "";
    if (!audioUrl || !title) continue;
    hits.push({
      audioUrl,
      title,
      artist,
      thumbnail: typeof row.artworkUrl100 === "string" ? row.artworkUrl100 : null,
      duration: 30,
      score: scoreMatch(q, title, artist),
    });
  }
  hits.sort((a, b) => b.score - a.score || a.title.length - b.title.length);
  return hits;
}

function pickHits(hits: PreviewHit[]): { best: PreviewHit | null; alt: PreviewHit | null } {
  const usable = hits.filter((h) => h.score >= 0.45);
  const pool = usable.length ? usable : hits.filter((h) => h.score >= 0.34);
  if (!pool.length) return { best: null, alt: null };
  const best = pool[0];
  const alt = pool.find((h) => h.audioUrl !== best.audioUrl) || null;
  return { best, alt };
}

async function lookupApple(trackId: string): Promise<PreviewHit | null> {
  const data = (await fetchJson(`https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}`)) as {
    results?: Array<Record<string, unknown>>;
  } | null;
  const row = data?.results?.find((r) => typeof r.previewUrl === "string") || data?.results?.[0];
  if (!row || typeof row.previewUrl !== "string") return null;
  return {
    audioUrl: row.previewUrl,
    title: typeof row.trackName === "string" ? row.trackName : "Apple preview",
    artist: typeof row.artistName === "string" ? row.artistName : "",
    thumbnail: typeof row.artworkUrl100 === "string" ? row.artworkUrl100 : null,
    duration: 30,
    score: 1,
  };
}

async function lookupDeezer(trackId: string): Promise<PreviewHit | null> {
  const row = (await fetchJson(`https://api.deezer.com/track/${encodeURIComponent(trackId)}`)) as Record<string, unknown> | null;
  if (!row || typeof row.preview !== "string") return null;
  const artist = row.artist as { name?: string } | undefined;
  const album = row.album as { cover_medium?: string } | undefined;
  return {
    audioUrl: row.preview,
    title: typeof row.title === "string" ? row.title : "Deezer preview",
    artist: typeof artist?.name === "string" ? artist.name : "",
    thumbnail: typeof album?.cover_medium === "string" ? album.cover_medium : null,
    duration: 30,
    score: 1,
  };
}

function spotifyPreviewFromHtml(html: string): string | null {
  const direct = html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[A-Za-z0-9]+/);
  if (direct) return direct[0];
  const escaped = html.match(/https:\\\/\\\/p\.scdn\.co\\\/mp3-preview\\\/[A-Za-z0-9]+/);
  if (escaped) return escaped[0].replace(/\\\//g, "/");
  return null;
}

function spotifyArtistFromHtml(html: string, title: string): string {
  const links = [...html.matchAll(/data-encore-id="textLink">([^<]{1,80})<\/a>/g)].map((m) =>
    m[1].replace(/&/g, "&").replace(/&#39;/g, "'").trim(),
  );
  const titleN = norm(title);
  return links.find((name) => name && norm(name) !== titleN && !/spotify/i.test(name)) || "";
}

async function oembed(endpoint: string): Promise<{ title: string; author: string; thumbnail: string | null } | null> {
  const data = (await fetchJson(endpoint)) as Record<string, unknown> | null;
  if (!data || typeof data.title !== "string") return null;
  return {
    title: data.title,
    author: typeof data.author_name === "string" ? data.author_name : "",
    thumbnail: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
  };
}

function resultBase(inputUrl: string, canonicalUrl: string, source: LinkSource): ResolveResult {
  return {
    ok: false,
    inputUrl,
    canonicalUrl,
    source,
    title: "",
    artist: "",
    thumbnail: null,
    audioUrl: null,
    fallbackAudioUrl: null,
    kind: "none",
    durationHint: null,
    note: "",
  };
}

function fromHit(
  base: ResolveResult,
  best: PreviewHit,
  alt: PreviewHit | null,
  note: string,
  thumbnail?: string | null,
): ResolveResult {
  return {
    ...base,
    ok: true,
    title: best.title,
    artist: best.artist,
    thumbnail: thumbnail || best.thumbnail,
    audioUrl: best.audioUrl,
    fallbackAudioUrl: alt?.audioUrl && alt.audioUrl !== best.audioUrl ? alt.audioUrl : null,
    kind: "preview",
    durationHint: best.duration,
    note,
  };
}

async function resolveDirect(base: ResolveResult, url: URL): Promise<ResolveResult> {
  if (isBlockedHost(url.hostname)) {
    return { ...base, error: "That host is not allowed." };
  }
  let name = "Audio file";
  try {
    const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    name = last.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || name;
  } catch {
    /* keep default */
  }
  if (AUDIO_EXT.test(url.pathname) || url.hostname === "p.scdn.co" || url.hostname.endsWith("dzcdn.net")) {
    return {
      ...base,
      ok: true,
      source: "direct",
      title: name,
      audioUrl: url.toString(),
      kind: "file",
      note: "Direct audio file.",
    };
  }
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "User-Agent": UA, Range: "bytes=0-0", Accept: "audio/*,*/*" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    const type = res.headers.get("content-type") || "";
    if (type.startsWith("audio/") || type.includes("application/ogg") || type.includes("application/octet-stream")) {
      return {
        ...base,
        ok: true,
        source: "direct",
        title: name,
        audioUrl: res.url || url.toString(),
        kind: "file",
        note: "Direct audio file.",
      };
    }
  } catch {
    /* fall through */
  }
  return {
    ...base,
    error: "That link is not a direct audio file. Paste a YouTube, Spotify, Apple Music, Deezer, or SoundCloud link, or a .mp3 / .wav / .ogg URL.",
  };
}

export async function resolveMediaLink(input: string): Promise<ResolveResult> {
  const extracted = extractUrl(input);
  if (!extracted) {
    return {
      ...resultBase(input, "", "unknown"),
      error: "Paste a link from YouTube, Spotify, Apple Music, Deezer, SoundCloud, or a direct audio file.",
    };
  }
  const key = extracted;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const expanded = await expandShort(extracted);
  const classified = classifyLink(expanded);
  const canonical = classified.url?.toString() || expanded;
  const base = resultBase(extracted, canonical, classified.source);

  let value: ResolveResult;
  try {
    value = await resolveClassified(base, classified, canonical);
  } catch (err) {
    value = { ...base, error: err instanceof Error ? err.message : "Could not resolve that link." };
  }
  if (value.ok) cache.set(key, { at: Date.now(), value });
  return value;
}

async function resolveClassified(
  base: ResolveResult,
  classified: { source: LinkSource; url: URL | null; spotifyId?: string },
  canonical: string,
): Promise<ResolveResult> {
  const url = classified.url;
  if (!url) return { ...base, error: "That does not look like a usable link." };
  if (!["http:", "https:"].includes(url.protocol)) {
    return { ...base, error: "Only http and https links are supported." };
  }
  if (isBlockedHost(url.hostname)) return { ...base, error: "That host is not allowed." };

  if (classified.source === "direct") return resolveDirect(base, url);
  if (classified.source === "unknown") return resolveDirect({ ...base, source: "unknown" }, url);

  if (classified.source === "apple") {
    const id = appleTrackId(url);
    if (!id) {
      return { ...base, error: "Open the song (not just the album) and paste that Apple Music link." };
    }
    const hit = await lookupApple(id);
    if (!hit) return { ...base, error: "Apple Music has no preview for that song." };
    return fromHit(base, hit, null, "Official Apple Music 30-second preview.");
  }

  if (classified.source === "deezer") {
    const id = deezerTrackId(url);
    if (!id) return { ...base, error: "Paste a Deezer track link (not a playlist or artist page)." };
    const hit = await lookupDeezer(id);
    if (!hit) return { ...base, error: "Deezer has no preview for that track." };
    return fromHit(base, hit, null, "Official Deezer 30-second preview.");
  }

  if (classified.source === "spotify") {
    const id = classified.spotifyId || url.pathname.match(/\/track\/([A-Za-z0-9]+)/)?.[1];
    if (!id) {
      return { ...base, error: "Paste a Spotify track link. Playlists and albums need a single song URL." };
    }
    const embedUrl = `https://open.spotify.com/embed/track/${id}`;
    const pageUrl = `https://open.spotify.com/track/${id}`;
    const [html, meta] = await Promise.all([
      fetchText(embedUrl),
      oembed(`https://open.spotify.com/oembed?url=${encodeURIComponent(pageUrl)}`),
    ]);
    const preview = html ? spotifyPreviewFromHtml(html) : null;
    const title = meta?.title || "Spotify track";
    const artist = html ? spotifyArtistFromHtml(html, title) : "";
    if (preview) {
      const hits = await searchPreviews([artist, title].filter(Boolean).join(" "));
      const alt = hits.find((h) => h.audioUrl !== preview) || null;
      return fromHit(
        { ...base, canonicalUrl: pageUrl },
        {
          audioUrl: preview,
          title,
          artist,
          thumbnail: meta?.thumbnail || hits[0]?.thumbnail || null,
          duration: 30,
          score: 1,
        },
        alt,
        "Official Spotify 30-second preview URL (p.scdn.co).",
        meta?.thumbnail,
      );
    }
    const { best, alt } = pickHits(await searchPreviews(title));
    if (!best) {
      return {
        ...base,
        canonicalUrl: pageUrl,
        title,
        thumbnail: meta?.thumbnail || null,
        error: "Spotify did not publish a preview for this track, and no store preview matched the title.",
      };
    }
    return fromHit(
      { ...base, canonicalUrl: pageUrl, thumbnail: meta?.thumbnail || null },
      { ...best, title: best.title || title, thumbnail: meta?.thumbnail || best.thumbnail },
      alt,
      "Spotify had no preview file. Loaded the closest official store preview for this title.",
      meta?.thumbnail,
    );
  }

  if (classified.source === "youtube") {
    const id = youtubeId(url);
    if (!id) return { ...base, error: "Could not read a YouTube video id from that link." };
    const watch = `https://www.youtube.com/watch?v=${id}`;
    const meta = await oembed(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`);
    if (!meta) return { ...base, canonicalUrl: watch, error: "YouTube did not return a title for that video." };
    const parsed = cleanTitle(meta.title);
    const query = [parsed.artist || meta.author, parsed.title].filter(Boolean).join(" ");
    const { best, alt } = pickHits(await searchPreviews(query));
    if (!best) {
      return {
        ...base,
        canonicalUrl: watch,
        title: parsed.title || meta.title,
        artist: parsed.artist || meta.author,
        thumbnail: meta.thumbnail,
        error: `No store preview matched “${meta.title}”. YouTube does not provide a raw audio file.`,
      };
    }
    return fromHit(
      {
        ...base,
        canonicalUrl: watch,
        thumbnail: meta.thumbnail,
      },
      best,
      alt,
      `YouTube does not serve a raw audio file. Matched “${meta.title}” to an official 30-second store preview.`,
      meta.thumbnail,
    );
  }

  const oembedUrl =
    classified.source === "soundcloud"
      ? `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(canonical)}`
      : classified.source === "tiktok"
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonical)}`
        : classified.source === "bandcamp"
          ? `https://bandcamp.com/oembed?format=json&url=${encodeURIComponent(canonical)}`
          : null;

  let title = "";
  let artist = "";
  let thumbnail: string | null = null;
  if (oembedUrl) {
    const meta = await oembed(oembedUrl);
    if (meta) {
      const parsed = cleanTitle(meta.title);
      title = parsed.title || meta.title;
      artist = parsed.artist || meta.author;
      thumbnail = meta.thumbnail;
    }
  }
  if (!title) {
    const html = await fetchText(canonical);
    const m = html?.match(/<title>([^<]{2,180})<\/title>/i);
    if (m) {
      const parsed = cleanTitle(m[1].replace(/&/g, "&").replace(/&#39;/g, "'"));
      title = parsed.title;
      artist = parsed.artist;
    }
  }
  if (!title) {
    return {
      ...base,
      error: "Could not read a title from that link, so there is nothing to match to a preview.",
    };
  }
  const { best, alt } = pickHits(await searchPreviews([artist, title].filter(Boolean).join(" ")));
  if (!best) {
    return {
      ...base,
      title,
      artist,
      thumbnail,
      error: `Found “${title}” but no official preview audio matched it.`,
    };
  }
  const label =
    classified.source === "soundcloud"
      ? "SoundCloud"
      : classified.source === "tiktok"
        ? "TikTok"
        : classified.source === "tidal"
          ? "Tidal"
          : classified.source === "amazon"
            ? "Amazon Music"
            : classified.source === "bandcamp"
              ? "Bandcamp"
              : "That link";
  return fromHit(
    { ...base, thumbnail: thumbnail || base.thumbnail },
    best,
    alt,
    `${label} does not hand out a raw audio file. Matched the title to an official 30-second store preview.`,
    thumbnail,
  );
}

export function isAllowedAudioFetch(target: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return { ok: false, error: "Invalid audio URL." };
  }
  if (!["http:", "https:"].includes(url.protocol)) return { ok: false, error: "Invalid protocol." };
  if (isBlockedHost(url.hostname)) return { ok: false, error: "Host is not allowed." };
  const host = url.hostname.toLowerCase();
  if (
    host.includes("youtube.com") ||
    host === "youtu.be" ||
    host.endsWith("spotify.com") ||
    host.includes("soundcloud.com") ||
    host.includes("tiktok.com")
  ) {
    return { ok: false, error: "Refusing to download a streaming page. Resolve the link first." };
  }
  return { ok: true, url };
}
