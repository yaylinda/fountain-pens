import { exec } from 'child_process';
import express from 'express';
import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8080;

// Data directory - use environment variable or default to ./data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
    if (!existsSync(DATA_DIR)) {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`Created data directory: ${DATA_DIR}`);
    }
}

// Initialize data files if they don't exist
async function initializeDataFiles() {
    const defaultData = {
        inks: [],
        pens: [],
        refillLog: [],
    };

    for (const [filename, defaultValue] of Object.entries(defaultData)) {
        const filePath = path.join(DATA_DIR, `${filename}.json`);
        if (!existsSync(filePath)) {
            await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
            console.log(`Initialized ${filename}.json with empty array`);
        }
    }
}

// Middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API: Get all data
app.get('/api/data', async (req, res) => {
    try {
        const [inks, pens, refillLog] = await Promise.all([
            fs.readFile(path.join(DATA_DIR, 'inks.json'), 'utf-8'),
            fs.readFile(path.join(DATA_DIR, 'pens.json'), 'utf-8'),
            fs.readFile(path.join(DATA_DIR, 'refillLog.json'), 'utf-8'),
        ]);

        res.json({
            inks: JSON.parse(inks),
            pens: JSON.parse(pens),
            refillLog: JSON.parse(refillLog),
        });
    } catch (error) {
        console.error('Error loading data:', error);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// API: Save JSON file
app.post('/api/save-json', async (req, res) => {
    try {
        const { filename, data } = req.body;

        if (!filename || data === undefined) {
            return res
                .status(400)
                .json({ error: 'Missing filename or data' });
        }

        // Sanitize filename (only allow alphanumeric)
        const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '');
        const allowedFiles = ['inks', 'pens', 'refillLog'];

        if (!allowedFiles.includes(safeFilename)) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(DATA_DIR, `${safeFilename}.json`);

        console.log(`Writing to file: ${filePath}`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

        // Git push is handled by the host's update script (runs every minute)
        // This keeps the container simple and credentials on the host

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// API: Get git diff for data files
app.get('/api/git/diff', async (req, res) => {
    try {
        const { stdout } = await execAsync('git diff src/data/*.json', {
            cwd: __dirname,
        });
        const hasChanges = stdout.trim().length > 0;
        res.json({ diff: stdout, hasChanges });
    } catch (error) {
        console.error('Error getting git diff:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to get git diff',
        });
    }
});

// API: Push changes to git
app.post('/api/git/push', async (req, res) => {
    try {
        // Add data files
        await execAsync('git add src/data/*.json', { cwd: __dirname });

        // Create commit with timestamp
        const timestamp = new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        const commitMessage = `Update data files - ${timestamp}`;
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: __dirname });

        // Push to remote
        const { stdout, stderr } = await execAsync('git push origin main', {
            cwd: __dirname,
        });

        res.json({
            success: true,
            message: `Successfully pushed changes: ${commitMessage}`,
            stdout,
            stderr,
        });
    } catch (error) {
        console.error('Error pushing to git:', error);
        const execError = error;
        res.status(500).json({
            success: false,
            error: execError.message || 'Failed to push to git',
            stdout: execError.stdout || '',
            stderr: execError.stderr || '',
        });
    }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
async function start() {
    await ensureDataDir();
    await initializeDataFiles();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Data directory: ${DATA_DIR}`);
    });
}

start().catch(console.error);
