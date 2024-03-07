import { optimizeImage } from 'wasm-image-optimization';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { load } from 'cheerio';

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

type Metadata = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

app.get('/metadata', cache({ cacheName: 'metadata' }), async (c) => {
  const url = c.req.query('url');

  if (!url) return c.body(null, 400);

  const res = await fetch(url);

  if (!res.ok) return c.body(null, 404);

  const html = await res.text();

  const $ = load(html);

  const og = $('meta[property="og:image"]').attr('content');
  const title = $('title').text();
  const description = $('meta[name="description"]').attr('content');

  const metadata: Metadata = {
    url,
    title,
    description,
    image: og,
  };

  console.log(metadata);

  return c.json(metadata, 200, {
    'cache-control': 'public, max-age=31536000, immutable',
  });
});

app.get(`/metadata/og`, cache({ cacheName: 'og' }), async (c) => {
  const ogURL = c.req.query('url');

  if (!ogURL) return c.body(null, 400);

  const res = await fetch(ogURL);
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
});

export default app;
