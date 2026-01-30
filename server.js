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

// Git repo directory - where the sparse checkout is mounted
const GIT_REPO_DIR = process.env.GIT_REPO_DIR || __dirname;

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

// Check if request is from local network
function isLocalNetwork(req) {
    // Get the client IP - check X-Forwarded-For first (for reverse proxy setups like nginx)
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    let clientIp;
    
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        // The first IP is the original client
        clientIp = forwardedFor.split(',')[0].trim();
    } else {
        // Fall back to remote address for direct connections
        clientIp = req.socket?.remoteAddress || req.ip || '';
    }
    
    if (!clientIp) {
        return false;
    }
    
    // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
    if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.slice(7);
    }
    
    // Check for localhost
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
        return true;
    }
    
    // Check for private network ranges
    // 10.0.0.0/8
    if (clientIp.startsWith('10.')) {
        return true;
    }
    
    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (clientIp.startsWith('172.')) {
        const secondOctet = parseInt(clientIp.split('.')[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) {
            return true;
        }
    }
    
    // 192.168.0.0/16
    if (clientIp.startsWith('192.168.')) {
        return true;
    }
    
    return false;
}

// API: Check if user is on local network
app.get('/api/is-local', (req, res) => {
    const isLocal = isLocalNetwork(req);
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || 'unknown');
    
    console.log(`Network check - IP: ${clientIp}, isLocal: ${isLocal}`);
    res.json({ isLocal, clientIp });
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
            cwd: GIT_REPO_DIR,
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

// API: Pull latest data from git
app.post('/api/git/pull', async (req, res) => {
    try {
        const { stdout, stderr } = await execAsync('git pull origin main', {
            cwd: GIT_REPO_DIR,
        });
        res.json({
            success: true,
            message: 'Successfully pulled latest data',
            stdout,
            stderr,
        });
    } catch (error) {
        console.error('Error pulling from git:', error);
        const execError = error;
        res.status(500).json({
            success: false,
            error: execError.message || 'Failed to pull from git',
            stdout: execError.stdout || '',
            stderr: execError.stderr || '',
        });
    }
});

// API: Push changes to git
app.post('/api/git/push', async (req, res) => {
    try {
        // Add data files
        await execAsync('git add src/data/*.json', { cwd: GIT_REPO_DIR });

        // Create commit with timestamp
        const timestamp = new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        const commitMessage = `Update data files - ${timestamp}`;
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: GIT_REPO_DIR });

        // Push to remote
        const { stdout, stderr } = await execAsync('git push origin main', {
            cwd: GIT_REPO_DIR,
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

// Pull latest data from git on startup
async function pullLatestData() {
    try {
        console.log(`Pulling latest data from git (repo: ${GIT_REPO_DIR})...`);
        const { stdout, stderr } = await execAsync('git pull origin main', {
            cwd: GIT_REPO_DIR,
        });
        if (stdout.trim()) console.log(`Git pull stdout: ${stdout.trim()}`);
        if (stderr.trim()) console.log(`Git pull stderr: ${stderr.trim()}`);
        console.log('Git pull complete');
    } catch (error) {
        console.error('Warning: Failed to pull latest data from git:', error.message);
        // Don't fail startup if pull fails - we'll use whatever data we have
    }
}

// Start server
async function start() {
    // Pull latest data from GitHub before starting
    await pullLatestData();
    
    await ensureDataDir();
    await initializeDataFiles();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Data directory: ${DATA_DIR}`);
        console.log(`Git repo directory: ${GIT_REPO_DIR}`);
    });
}

start().catch(console.error);
