import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAllowedAudioFetch, resolveMediaLink } from './src/audio/streamLinkResolver.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'aura-dsp-companion', timestamp: Date.now() });
  });

  // Source code download endpoint
  app.get(['/api/download-source', '/aura-dsp-companion.zip'], (_req, res) => {
    const zipPath = path.resolve(__dirname, 'public', 'aura-dsp-companion.zip');
    res.setHeader('Content-Disposition', 'attachment; filename="aura-dsp-companion.zip"');
    res.setHeader('Content-Type', 'application/zip');
    res.sendFile(zipPath);
  });

  app.get('/api/resolve-link', async (req, res) => {
    const raw = req.query.url;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing url.' });
    }
    try {
      const result = await resolveMediaLink(raw);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Could not resolve link.' });
    }
  });

  // Audio proxy endpoint: allows fetching audio files from remote hosts without browser CORS restrictions
  app.get('/api/proxy-audio', async (req, res) => {
    const audioUrl = req.query.url;
    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "url" query parameter' });
    }

    const allowed = isAllowedAudioFetch(audioUrl);
    if (!allowed.ok) {
      return res.status(400).json({ error: allowed.error });
    }

    try {
      const host = allowed.url.hostname.toLowerCase();
      const youtubeAudio = host.endsWith('googlevideo.com');
      const response = await fetch(allowed.url, {
        headers: {
          'User-Agent': youtubeAudio
            ? 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Oculus Quest 3) gzip'
            : 'Mozilla/5.0 (compatible; AuraDSP/1.0; AudioEngine)',
          Accept: 'audio/*, application/octet-stream;q=0.9, */*;q=0.8',
          ...(youtubeAudio ? { Referer: 'https://www.youtube.com/', Origin: 'https://www.youtube.com', Range: 'bytes=0-20971519' } : {})
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Remote host returned HTTP ${response.status}: ${response.statusText}`
        });
      }

      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      if (contentType.includes('text/html')) {
        return res.status(415).json({
          error:
            'The provided link returned an HTML webpage instead of an audio file. Please ensure the URL points directly to an audio file (.mp3, .wav, .ogg).'
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 20 * 1024 * 1024) {
        return res.status(413).json({ error: 'Audio file is larger than 20 MB.' });
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.warn('Audio proxy fetch error:', err.message);
      res.status(502).json({ error: `Could not fetch remote audio: ${err.message}` });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURA DSP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
