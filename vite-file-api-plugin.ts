import * as fs from 'fs';
import type { ServerResponse } from 'http';
import * as path from 'path';
import type { Connect } from 'vite';
import { Plugin } from 'vite';

const allowedFiles = ['inks', 'pens', 'refillLog'] as const;

const sendJson = (
    res: ServerResponse,
    statusCode: number,
    data: unknown
): void => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
};

const getClientIp = (req: Connect.IncomingMessage): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor;
    const clientIp =
        forwardedIp?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        '';

    return clientIp.startsWith('::ffff:') ? clientIp.slice(7) : clientIp;
};

const isLocalNetwork = (req: Connect.IncomingMessage): boolean => {
    const clientIp = getClientIp(req);

    if (
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp === 'localhost'
    ) {
        return true;
    }

    if (clientIp.startsWith('10.') || clientIp.startsWith('192.168.')) {
        return true;
    }

    if (clientIp.startsWith('172.')) {
        const secondOctet = Number.parseInt(clientIp.split('.')[1] || '', 10);
        return secondOctet >= 16 && secondOctet <= 31;
    }

    return false;
};

/**
 * Vite plugin to add local API endpoints for reading and writing JSON data.
 */
export default function fileApiPlugin(): Plugin {
    return {
        name: 'file-api-plugin',
        configureServer(server) {
            const dataDir = path.join(server.config.root, 'src', 'data');

            server.middlewares.use(
                '/api/is-local',
                (req: Connect.IncomingMessage, res: ServerResponse) => {
                    if (req.method !== 'GET') {
                        res.statusCode = 405;
                        res.end('Method Not Allowed');
                        return;
                    }

                    sendJson(res, 200, {
                        isLocal: isLocalNetwork(req),
                        clientIp: getClientIp(req) || 'unknown',
                    });
                }
            );

            server.middlewares.use(
                '/api/data',
                async (_req: Connect.IncomingMessage, res: ServerResponse) => {
                    try {
                        const [inks, pens, refillLog] = await Promise.all(
                            allowedFiles.map((filename) =>
                                fs.promises.readFile(
                                    path.join(dataDir, `${filename}.json`),
                                    'utf-8'
                                )
                            )
                        );

                        sendJson(res, 200, {
                            inks: JSON.parse(inks),
                            pens: JSON.parse(pens),
                            refillLog: JSON.parse(refillLog),
                        });
                    } catch (error) {
                        console.error('Error handling /api/data:', error);
                        sendJson(res, 500, {
                            success: false,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : 'Unknown error',
                        });
                    }
                }
            );

            // Handle JSON file saving
            server.middlewares.use(
                '/api/save-json',
                async (req: Connect.IncomingMessage, res: ServerResponse) => {
                    if (req.method !== 'POST') {
                        res.statusCode = 405;
                        res.end('Method Not Allowed');
                        return;
                    }

                    try {
                        // Get the request body
                        const chunks: Buffer[] = [];
                        for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
                            chunks.push(chunk);
                        }
                        const body = JSON.parse(
                            Buffer.concat(chunks).toString()
                        );

                        // Extract filename and data
                        const { filename, data } = body;

                        if (!filename || !data) {
                            res.statusCode = 400;
                            res.end('Bad Request: Missing filename or data');
                            return;
                        }

                        // Ensure the filename is safe (prevent directory traversal)
                        const safeFilename = filename.replace(
                            /[^a-zA-Z0-9]/g,
                            ''
                        );

                        if (!allowedFiles.includes(safeFilename)) {
                            res.statusCode = 400;
                            res.end('Bad Request: Invalid filename');
                            return;
                        }

                        const filePath = path.join(dataDir, `${safeFilename}.json`);

                        console.log(`Writing to file: ${filePath}`);

                        // Write the data to the file
                        await fs.promises.writeFile(
                            filePath,
                            JSON.stringify(data, null, 2),
                            'utf-8'
                        );

                        // Send success response
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true }));
                    } catch (error) {
                        console.error('Error handling /api/save-json:', error);
                        res.statusCode = 500;
                        res.end(
                            JSON.stringify({
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : 'Unknown error',
                            })
                        );
                    }
                }
            );
        },
    };
}
