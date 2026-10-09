import app from './app.ts';

export default async function handler(req: any, res: any) {
  try {
    // 1. Extract target route from query or headers if rewritten by Vercel
    let targetPath = '';

    if (req.query) {
      if (typeof req.query.route === 'string' && req.query.route) {
        targetPath = req.query.route;
      } else if (typeof req.query.path === 'string' && req.query.path) {
        targetPath = req.query.path;
      } else if (typeof req.query[0] === 'string' && req.query[0]) {
        targetPath = req.query[0];
      } else if (typeof req.query['0'] === 'string' && req.query['0']) {
        targetPath = req.query['0'];
      }
    }

    if (!targetPath && typeof req.url === 'string' && req.url.includes('?')) {
      try {
        const parsed = new URL(req.url, 'http://localhost');
        const qRoute =
          parsed.searchParams.get('route') ||
          parsed.searchParams.get('path') ||
          parsed.searchParams.get('0');
        if (qRoute) {
          targetPath = qRoute;
        }
      } catch {
        // ignore url parsing error
      }
    }

    const forwardedUri =
      req.headers['x-forwarded-uri'] ||
      req.headers['x-invoke-path'] ||
      req.headers['x-matched-path'];
    if (
      !targetPath &&
      forwardedUri &&
      typeof forwardedUri === 'string' &&
      forwardedUri !== '/api' &&
      forwardedUri !== '/' &&
      forwardedUri.startsWith('/api/')
    ) {
      targetPath = forwardedUri;
    }

    if (targetPath) {
      const clean = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      req.url = clean.startsWith('/api') ? clean : `/api${clean}`;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('Serverless invocation error:', err);
    return res.status(500).json({
      error: 'Serverless invocation error',
      message: err?.message || String(err),
    });
  }
}
