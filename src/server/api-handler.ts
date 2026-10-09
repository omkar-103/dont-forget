import app from './app.ts';

export default async function handler(req: any, res: any) {
  try {
    const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-invoke-path'];
    if (forwardedUri && typeof forwardedUri === 'string' && (req.url === '/' || req.url === '/api' || !req.url.startsWith('/api/'))) {
      req.url = forwardedUri;
    }
    return app(req, res);
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverless invocation error', message: err?.message || String(err) });
  }
}
