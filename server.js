import { exec } from 'child_process';
import express from 'express';
import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- Credential lock cleanup ---
const CREDENTIAL_LOCK_PATH = path.join(os.homedir(), '.git-credential-store.lock');
const STALE_LOCK_THRESHOLD_MS = 30_000;

async function cleanStaleCredentialLock() {
    try {
        const stat = await fs.stat(CREDENTIAL_LOCK_PATH);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs > STALE_LOCK_THRESHOLD_MS) {
            await fs.unlink(CREDENTIAL_LOCK_PATH);
            console.log(`Removed stale credential lock (age: ${Math.round(ageMs / 1000)}s)`);
        } else {
            // Lock is fresh — wait briefly and retry once
            await new Promise((resolve) => setTimeout(resolve, 2000));
            try {
                await fs.stat(CREDENTIAL_LOCK_PATH);
                // Still exists after wait — let git deal with it
            } catch {
                // Lock gone after wait — good
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        // No lock file — happy path
    }
}

// --- Serialization queue for git operations ---
let gitQueue = Promise.resolve();

function enqueueGitOperation(fn) {
    const op = gitQueue.then(fn, fn); // run even if previous op rejected
    gitQueue = op.catch(() => {}); // swallow so next op still runs
    return op;
}

function gitExecEnv() {
    return {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
    };
}

async function execGitAsync(command, options = {}) {
    return execAsync(command, {
        ...options,
        env: {
            ...gitExecEnv(),
            ...options.env,
        },
    });
}

async function getUnpushedCommitCount() {
    const { stdout } = await execGitAsync('git rev-list --count origin/main..HEAD', {
        cwd: GIT_REPO_DIR,
    });
    return parseInt(stdout.trim(), 10) || 0;
}

// --- Error classification ---
function classifyGitError(error) {
    const msg = `${error.message || ''} ${error.stderr || ''} ${error.stdout || ''}`;

    if (/credential.*lock/i.test(msg)) {
        return {
            errorCode: 'CREDENTIAL_LOCK',
            error: 'Git credential storage is temporarily locked. Please try again in a few seconds.',
            transient: true,
        };
    }
    if (/non-fast-forward/i.test(msg)) {
        return {
            errorCode: 'NON_FAST_FORWARD',
            error: 'Remote has newer changes. Pull and retry.',
            transient: false,
        };
    }
    if (/could not read from remote/i.test(msg)) {
        return {
            errorCode: 'NETWORK_ERROR',
            error: 'Cannot connect to GitHub. Check network and try again.',
            transient: true,
        };
    }
    if (/authentication failed/i.test(msg)) {
        return {
            errorCode: 'AUTH_FAILURE',
            error: 'GitHub authentication failed. Credentials may need to be refreshed.',
            transient: false,
        };
    }
    if (/could not read Username/i.test(msg)) {
        return {
            errorCode: 'AUTH_FAILURE',
            error: 'GitHub authentication is not configured. Please try again in a minute or contact support.',
            transient: true,
        };
    }
    return {
        errorCode: 'UNKNOWN',
        error: msg.trim() || 'An unknown error occurred',
        transient: false,
    };
}

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
        await cleanStaleCredentialLock();
        const { stdout, stderr } = await execGitAsync('git pull origin main', {
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
        const result = await enqueueGitOperation(async () => {
            // Clean stale credential lock before any remote-contacting operation
            await cleanStaleCredentialLock();

            // Add data files
            // The --sparse flag (Git 2.34+) allows staging files outside the sparse-checkout cone,
            // which is required when the repo is mounted as a sparse checkout in Docker
            await execGitAsync('git add --sparse src/data/*.json', { cwd: GIT_REPO_DIR });

            // Create commit with timestamp
            const timestamp = new Date().toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            const commitMessage = `Update data files - ${timestamp}`;

            let nothingToCommit = false;
            try {
                await execGitAsync(`git commit -m "${commitMessage}"`, { cwd: GIT_REPO_DIR });
            } catch (commitError) {
                if (/nothing (added )?to commit/i.test(commitError.stdout || commitError.message)) {
                    nothingToCommit = true;
                } else {
                    throw commitError;
                }
            }

            if (nothingToCommit) {
                const unpushed = await getUnpushedCommitCount();
                if (unpushed === 0) {
                    return { success: true, message: 'No changes to push' };
                }
            }

            const unpushedBeforePush = nothingToCommit ? await getUnpushedCommitCount() : 0;

            // Pull --rebase before push to avoid non-fast-forward rejections
            await cleanStaleCredentialLock();
            try {
                await execGitAsync('git pull --rebase origin main', { cwd: GIT_REPO_DIR });
            } catch (pullError) {
                // If rebase hit conflicts, abort to restore working tree
                if (/conflict/i.test(`${pullError.message || ''} ${pullError.stderr || ''}`)) {
                    try {
                        await execGitAsync('git rebase --abort', { cwd: GIT_REPO_DIR });
                    } catch {
                        // best-effort abort
                    }
                    const classified = {
                        errorCode: 'REBASE_CONFLICT',
                        error: 'Remote has conflicting changes. Your local commit is preserved but could not be pushed.',
                        transient: false,
                    };
                    return {
                        success: false,
                        ...classified,
                        stdout: pullError.stdout || '',
                        stderr: pullError.stderr || '',
                    };
                }
                throw pullError;
            }

            // Push to remote
            await cleanStaleCredentialLock();
            const { stdout, stderr } = await execGitAsync('git push origin main', {
                cwd: GIT_REPO_DIR,
            });

            return {
                success: true,
                message: nothingToCommit
                    ? `Successfully pushed ${unpushedBeforePush} previously unpushed commit(s)`
                    : `Successfully pushed changes: ${commitMessage}`,
                stdout,
                stderr,
            };
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error pushing to git:', error);
        const classified = classifyGitError(error);
        res.status(500).json({
            success: false,
            ...classified,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
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
        await cleanStaleCredentialLock();
        const { stdout, stderr } = await execGitAsync('git pull origin main', {
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
