import express from 'express';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Persistent storage directory for global project-level videos
  const DATA_DIR = path.join(process.cwd(), 'persistent_data', 'videos');
  const META_FILE = path.join(DATA_DIR, 'meta.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Robust video file locator across all production and development paths
  function findVideoFile(filename: string): string | null {
    if (!filename) return null;
    const candidates = [
      path.join(process.cwd(), 'public', 'Videos', filename),
      path.join(process.cwd(), 'public', 'videos', filename),
      path.join(process.cwd(), 'dist', 'Videos', filename),
      path.join(process.cwd(), 'dist', 'videos', filename),
      path.join(process.cwd(), 'src', 'Videos', filename),
      path.join(process.cwd(), 'src', 'videos', filename),
      path.join(DATA_DIR, filename),
      path.join(process.cwd(), 'persistent_data', 'videos', filename),
      path.join(process.cwd(), 'public', filename),
      path.join(process.cwd(), 'dist', filename),
    ];
    for (const cand of candidates) {
      try {
        if (fs.existsSync(cand)) {
          return cand;
        }
      } catch {}
    }
    return null;
  }

  // Ensure known project video assets are synced into DATA_DIR on start without modifying source videos
  function syncProjectVideos() {
    const knownVideos = [
      'bubble.mp4',
      'insertion.mp4',
      'selection.mp4',
      'Stack Operations.mp4',
      'Stack Data Structure.mp4',
    ];

    for (const vid of knownVideos) {
      const dest = path.join(DATA_DIR, vid);
      if (!fs.existsSync(dest)) {
        const found = findVideoFile(vid);
        if (found && found !== dest) {
          try {
            fs.copyFileSync(found, dest);
            console.log(`[Server] Synced video ${vid} into DATA_DIR from ${found}`);
          } catch (e) {
            console.warn(`[Server] Could not sync ${vid}:`, e);
          }
        }
      }
    }
  }
  syncProjectVideos();

  interface VideoMeta {
    algoId: string;
    algorithmId?: string;
    mapping?: string;
    name: string;
    filename: string;
    size: number;
    mimeType: string;
    isLocked: boolean;
    locked?: boolean;
    uploadedAt: string;
  }

  function loadMeta(): Record<string, VideoMeta> {
    try {
      if (fs.existsSync(META_FILE)) {
        const raw = fs.readFileSync(META_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Server] Error reading meta file:', e);
    }
    return {};
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const MAPPINGS_FILE = path.join(DATA_DIR, 'visualize_videos.json');

  function loadMappings(): Record<string, any> {
    try {
      if (fs.existsSync(MAPPINGS_FILE)) {
        return JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
      }
    } catch (e) {
      console.warn('[Server] Error reading visualize_videos.json:', e);
    }
    return {};
  }

  // Serve static video files directly for production & development
  const staticVideoOptions = {
    acceptRanges: true,
    setHeaders: (res: express.Response, filePath: string) => {
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    },
  };

  app.use('/Videos', express.static(path.join(process.cwd(), 'public', 'Videos'), staticVideoOptions));
  app.use('/Videos', express.static(path.join(process.cwd(), 'dist', 'Videos'), staticVideoOptions));
  app.use('/Videos', express.static(path.join(process.cwd(), 'src', 'Videos'), staticVideoOptions));
  app.use('/Videos', express.static(DATA_DIR, staticVideoOptions));
  app.use('/videos', express.static(path.join(process.cwd(), 'public', 'videos'), staticVideoOptions));
  app.use('/videos', express.static(path.join(process.cwd(), 'dist', 'videos'), staticVideoOptions));
  app.use('/videos', express.static(path.join(process.cwd(), 'src', 'Videos'), staticVideoOptions));
  app.use('/videos', express.static(DATA_DIR, staticVideoOptions));

  // Helper to stream video file with Range header support
  function streamVideoFile(filePath: string, res: express.Response, mimeType = 'video/mp4') {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    return res.sendFile(filePath, { acceptRanges: true, maxAge: 0 }, (err) => {
      if (err && !res.headersSent) {
        console.error('[Server] Error streaming video file:', err);
        res.status(500).end();
      }
    });
  }

  // Persistent mapping endpoint: visualizeVideos/sorting/bubble-sort
  app.get('/api/videos/visualizeVideos/sorting/bubble-sort', (_req, res) => {
    const bubblePath = findVideoFile('bubble.mp4');
    if (!bubblePath) {
      return res.status(404).json({ error: 'Bubble sort video not found.' });
    }
    return streamVideoFile(bubblePath, res);
  });

  // Category mapping endpoint: /api/videos/visualizeVideos/:category/:algoId
  app.get('/api/videos/visualizeVideos/:category/:algoId', (req, res) => {
    const { category, algoId } = req.params;
    const key = `visualizeVideos/${category}/${algoId}`;
    const mappings = loadMappings();
    const mapping = mappings[key];

    const filename =
      mapping?.filename ||
      (algoId.startsWith('bubble')
        ? 'bubble.mp4'
        : algoId.startsWith('insertion')
        ? 'insertion.mp4'
        : algoId.startsWith('selection')
        ? 'selection.mp4'
        : `${algoId}.mp4`);
    const filePath = findVideoFile(filename);

    if (filePath) {
      return streamVideoFile(filePath, res, mapping?.mimeType || 'video/mp4');
    }

    return res.status(404).json({ error: `Video for ${key} not found.` });
  });

  // Dedicated Stack Video endpoint (unmodified Stack Operations video)
  app.get('/api/videos/stack', (_req, res) => {
    const stackPath = findVideoFile('Stack Operations.mp4');
    if (stackPath) {
      return streamVideoFile(stackPath, res);
    }
    return res.status(404).json({ error: 'Stack video file not found.' });
  });

  // 1. GET /api/videos - returns all videos and their permanent lock status with stable static paths
  app.get('/api/videos', (_req, res) => {
    const store = loadMeta();
    const mappings = loadMappings();
    const result: Record<string, any> = {};

    const algoIds = ['bubble', 'bubble-sort', 'insertion', 'selection'];
    for (const rawAlgoId of algoIds) {
      const algoKey = rawAlgoId === 'bubble-sort' ? 'bubble' : rawAlgoId;
      const record = store[rawAlgoId] || store[algoKey];

      const filename =
        record?.filename || (rawAlgoId.startsWith('bubble') ? 'bubble.mp4' : `${rawAlgoId}.mp4`);
      const filePath = findVideoFile(filename);

      if (filePath) {
        let size = record?.size || 0;
        try {
          const stats = fs.statSync(filePath);
          size = stats.size;
        } catch {}

        const isBubble = rawAlgoId === 'bubble' || rawAlgoId === 'bubble-sort';
        const defaultName = isBubble
          ? 'Bubble Sort Video'
          : rawAlgoId === 'insertion'
          ? 'Insertion Sort Video'
          : 'Selection Sort Video';

        result[rawAlgoId] = {
          algoId: rawAlgoId,
          algorithmId: isBubble ? 'bubble-sort' : rawAlgoId,
          name: defaultName,
          size,
          mimeType: 'video/mp4',
          isLocked: true,
          locked: true,
          mapping: isBubble ? 'visualizeVideos/sorting/bubble-sort' : undefined,
          uploadedAt: record?.uploadedAt || '2026-09-08T00:00:00.000Z',
          url: `/Videos/${filename}`,
        };
        continue;
      }

      result[rawAlgoId] = {
        algoId: rawAlgoId,
        algorithmId: rawAlgoId,
        name: '',
        size: 0,
        mimeType: '',
        isLocked: true,
        locked: true,
        uploadedAt: null,
        url: `/Videos/${filename}`,
      };
    }

    res.json({
      success: true,
      videos: result,
      mappings,
      lockedVideos: {
        'bubble-sort': true,
        bubble: true,
        insertion: true,
        selection: true,
      },
    });
  });

  // 2. GET /api/videos/:algoId - streams the video file with Range header support
  app.get('/api/videos/:algoId', (req, res) => {
    const { algoId } = req.params;

    if (algoId === 'bubble' || algoId === 'bubble-sort') {
      const bubblePath = findVideoFile('bubble.mp4');
      if (bubblePath) {
        return streamVideoFile(bubblePath, res);
      }
    }

    if (algoId === 'insertion' || algoId === 'insertion-sort') {
      const insertionPath = findVideoFile('insertion.mp4');
      if (insertionPath) {
        return streamVideoFile(insertionPath, res);
      }
    }

    if (algoId === 'selection' || algoId === 'selection-sort') {
      const selectionPath = findVideoFile('selection.mp4');
      if (selectionPath) {
        return streamVideoFile(selectionPath, res);
      }
    }

    if (algoId === 'stack') {
      const stackPath = findVideoFile('Stack Operations.mp4');
      if (stackPath) {
        return streamVideoFile(stackPath, res);
      }
    }

    const store = loadMeta();
    const record = store[algoId];
    const filename = record?.filename || `${algoId}.mp4`;
    const filePath = findVideoFile(filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Video file not found on disk.' });
    }

    return streamVideoFile(filePath, res, record?.mimeType || 'video/mp4');
  });

  // 3. POST /api/videos/:algoId - all built-in videos are permanently locked final assets
  app.post('/api/videos/:algoId', (req, res) => {
    const { algoId } = req.params;
    const isBubble = algoId === 'bubble' || algoId === 'bubble-sort';
    const filename = isBubble
      ? 'bubble.mp4'
      : algoId.startsWith('insertion')
      ? 'insertion.mp4'
      : algoId.startsWith('selection')
      ? 'selection.mp4'
      : `${algoId}.mp4`;
    const existingPath = findVideoFile(filename);

    // Drain request stream without overwriting locked final video assets
    req.on('data', () => {});
    req.on('end', () => {
      let size = 0;
      if (existingPath) {
        try {
          size = fs.statSync(existingPath).size;
        } catch {}
      }
      return res.status(200).json({
        success: true,
        video: {
          algoId: isBubble ? 'bubble' : algoId,
          algorithmId: isBubble ? 'bubble-sort' : algoId,
          name: isBubble
            ? 'Bubble Sort Video'
            : algoId === 'insertion'
            ? 'Insertion Sort Video'
            : 'Selection Sort Video',
          filename,
          size,
          mimeType: 'video/mp4',
          isLocked: true,
          locked: true,
          url: `/Videos/${filename}`,
        },
        alreadyLocked: true,
      });
    });
  });

  // 4. Strictly reject any attempt to delete or alter locked videos
  app.delete('/api/videos/:algoId', (_req, res) => {
    return res.status(403).json({
      error: 'Videos in the Visualize section are permanently locked and cannot be deleted.',
    });
  });
  app.put('/api/videos/:algoId', (_req, res) => {
    return res.status(403).json({
      error: 'Videos in the Visualize section are permanently locked and cannot be replaced or updated.',
    });
  });

  // Determine whether to serve production build from dist or Vite middleware in development
  const distPath = path.join(process.cwd(), 'dist');
  const distIndex = path.join(distPath, 'index.html');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    (process.env.npm_lifecycle_event !== 'dev' && fs.existsSync(distIndex));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, staticVideoOptions));
    app.get('*', (req, res) => {
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/Videos/') ||
        req.path.startsWith('/videos/')
      ) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      res.sendFile(distIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
