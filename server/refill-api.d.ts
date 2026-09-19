import type { IncomingMessage, ServerResponse } from 'node:http';

export function createRefillApi(dataDir: string): (
    req: IncomingMessage,
    res: ServerResponse,
) => Promise<void>;
