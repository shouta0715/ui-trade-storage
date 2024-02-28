import { optimizeImage } from 'wasm-image-optimization';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';

const BASE = 'http://127.0.0.1:9000';
const ORIGIN = 'http://localhost:3000';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: ORIGIN,
    allowMethods: ['GET'],
  })
);

app.get('/images/:key', cache({ cacheName: 'images' }), async (c) => {
  const key = c.req.param('key');
  try {
    // TODO: Production is fetch -> bucket
    const res = await fetch(BASE + '/ui-trade-preview/' + key);

    if (!res.ok) return c.body(null, 404);

    const width = c.req.query('width');
    const height = c.req.query('height');
    const quality = c.req.query('quality');

    const buffer = await res.arrayBuffer();
    const image = await optimizeImage({
      image: buffer,
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: quality ? parseInt(quality) : 75,
      format: 'webp',
    });

    return c.body(image, 200, {
      'Content-Type': 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
    });
  } catch (e) {
    console.error(e);
    return c.body(null, 500);
  }
});

app.get('/files/:key', cache({ cacheName: 'files' }), async (c) => {
  const key = c.req.param('key');
  try {
    // TODO: Production is fetch -> bucket
    const res = await fetch(BASE + '/ui-trade-public/' + key);

    if (!res.ok) return c.body(null, 404);

    const contentType = res.headers.get('content-type');

    if (!contentType)
      return c.body(await res.arrayBuffer(), 200, {
        'cache-control': 'public, max-age=31536000, immutable',
      });

    return c.body(await res.arrayBuffer(), 200, {
      'Content-Type': contentType,
      'cache-control': 'public, max-age=31536000, immutable',
    });
  } catch (e) {
    console.error(e);

    return c.body(null, 500);
  }
});

export default app;
