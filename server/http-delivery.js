import compression from 'compression';
import express from 'express';
import path from 'node:path';

// Negotiate compression and set Vary so caches keep encodings separate.
export function configureResponseDelivery(app) {
    app.use(compression());
    app.use('/api', (_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        next();
    });
}

export function serveFrontend(app, distDirectory) {
    // Vite fingerprints every generated asset. New content gets a new URL.
    // Missing chunks must be 404s, never cacheable copies of the SPA document.
    app.use('/assets', express.static(path.join(distDirectory, 'assets'), {
        maxAge: '1y',
        immutable: true,
        fallthrough: false,
    }));
    app.use(express.static(distDirectory, {
        maxAge: 0,
        setHeaders(res, file) {
            if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
    }));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(distDirectory, 'index.html'), {
            headers: { 'Cache-Control': 'no-cache' },
        });
    });
}
