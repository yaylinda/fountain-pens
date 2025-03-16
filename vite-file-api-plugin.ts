import * as fs from 'fs';
import type { ServerResponse } from 'http';
import * as path from 'path';
import type { Connect } from 'vite';
import { Plugin } from 'vite';

/**
 * Vite plugin to add API endpoints for writing JSON data to files
 */
export default function fileApiPlugin(): Plugin {
    return {
        name: 'file-api-plugin',
        configureServer(server) {
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

                        // Get project root directory
                        const rootDir = process.cwd();
                        const filePath = path.join(
                            rootDir,
                            'src',
                            'data',
                            `${safeFilename}.json`
                        );

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
