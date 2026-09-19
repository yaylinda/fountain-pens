import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}

function validateEntry(entry) {
    if (!entry || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
        typeof entry.penId !== 'string' || !entry.penId ||
        !Array.isArray(entry.inkIds) || !entry.inkIds.length ||
        !entry.inkIds.every((id) => typeof id === 'string' && id.length > 0) ||
        typeof entry.notes !== 'string' ||
        (entry.notPure !== undefined && typeof entry.notPure !== 'boolean') ||
        Object.keys(entry).some((key) => !['date', 'penId', 'inkIds', 'notes', 'notPure'].includes(key))) {
        fail(400, 'Invalid refill entry.');
    }
}

// Shared by Express and Vite. Each operation reads the latest file, and writes
// are serialized so simultaneous requests cannot overwrite one another.
export function createRefillApi(dataDir) {
    let queue = Promise.resolve();
    const file = path.join(dataDir, 'refillLog.json');
    return async (req, res) => {
        const send = (status, body) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
        };
        try {
            const route = new URL(req.url, 'http://localhost').pathname;
            const create = req.method === 'POST' && route === '/';
            const target = /^\/(\d+)$/.exec(route);
            if (!create && !(target && ['PUT', 'DELETE'].includes(req.method))) {
                fail(405, 'Use POST to create, PUT to edit, or DELETE to remove a refill entry.');
            }
            let body = req.body;
            if (body === undefined) {
                const chunks = [];
                for await (const chunk of req) chunks.push(Buffer.from(chunk));
                try {
                    body = JSON.parse(Buffer.concat(chunks).toString());
                } catch {
                    fail(400, 'Invalid JSON.');
                }
            }
            if (!body || typeof body !== 'object') fail(400, 'Missing request body.');
            if (req.method !== 'DELETE') validateEntry(body.entry);
            if (!create && !body.expected) fail(400, 'The original entry is required for edits and deletions.');
            const operation = queue.then(async () => {
                const entries = JSON.parse(await fs.readFile(file, 'utf8'));
                const index = create ? entries.length : Number(target[1]);
                if (!create) {
                    if (!Number.isSafeInteger(index) || !entries[index]) fail(404, 'This journal entry no longer exists. Reload the journal.');
                    if (!isDeepStrictEqual(entries[index], body.expected)) {
                        fail(409, 'This journal entry changed since it was opened. Reload the journal before editing.');
                    }
                }
                if (create) entries.push(body.entry);
                else if (req.method === 'PUT') entries[index] = body.entry;
                else entries.splice(index, 1);
                // Readers always see a complete JSON document.
                const temporary = `${file}.tmp`;
                await fs.writeFile(temporary, JSON.stringify(entries, null, 2), 'utf8');
                await fs.rename(temporary, file);
                return { success: true, refillLog: entries, index };
            });
            queue = operation.catch(() => {});
            send(create ? 201 : 200, await operation);
        } catch (error) {
            send(error.status || 500, { error: error.status ? error.message : 'Failed to save the journal. Please try again.' });
        }
    };
}
