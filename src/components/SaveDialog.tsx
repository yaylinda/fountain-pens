import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useDirtyState } from '../context/DirtyStateContext';

interface SaveDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface DiffResponse {
    diff: string;
    hasChanges: boolean;
}

interface PushResponse {
    success: boolean;
    message?: string;
    error?: string;
    stdout?: string;
    stderr?: string;
}

export default function SaveDialog({ open, onClose, onSuccess }: SaveDialogProps) {
    const { setDirty } = useDirtyState();
    const [diff, setDiff] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setLoading(true);
            setError(null);
            fetch('/api/git/diff')
                .then((res) => res.json())
                .then((data: DiffResponse) => {
                    setDiff(data.diff || 'No changes detected');
                    setLoading(false);
                })
                .catch((err) => {
                    setError(`Failed to fetch diff: ${err.message}`);
                    setLoading(false);
                });
        }
    }, [open]);

    const handlePush = async () => {
        setPushing(true);
        setError(null);
        try {
            const res = await fetch('/api/git/push', { method: 'POST' });
            const data: PushResponse = await res.json();
            if (data.success) {
                setDirty(false);
                onClose();
                onSuccess?.();
            } else {
                const errorDetails = [
                    data.error,
                    data.stdout && `stdout: ${data.stdout}`,
                    data.stderr && `stderr: ${data.stderr}`,
                ]
                    .filter(Boolean)
                    .join('\n\n');
                setError(errorDetails || 'Push failed');
            }
        } catch (err) {
            setError(`Push failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setPushing(false);
        }
    };

    const handleClose = () => {
        if (!pushing) {
            onClose();
        }
    };

    const formatDiffLine = (line: string, index: number) => {
        let backgroundColor = 'transparent';
        let color = 'inherit';

        if (line.startsWith('+') && !line.startsWith('+++')) {
            backgroundColor = 'rgba(46, 160, 67, 0.15)';
            color = '#22863a';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            backgroundColor = 'rgba(248, 81, 73, 0.15)';
            color = '#cb2431';
        } else if (line.startsWith('@@')) {
            color = '#6f42c1';
        }

        return (
            <Box
                key={index}
                component="span"
                sx={{
                    display: 'block',
                    backgroundColor,
                    color,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre',
                }}
            >
                {line}
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>Review Changes Before Saving</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : pushing ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            py: 4,
                            gap: 2,
                        }}
                    >
                        <CircularProgress />
                        <Typography>Pushing to GitHub...</Typography>
                    </Box>
                ) : error ? (
                    <Box>
                        <Typography color="error" gutterBottom>
                            Error:
                        </Typography>
                        <Box
                            component="pre"
                            sx={{
                                backgroundColor: 'rgba(248, 81, 73, 0.1)',
                                border: '1px solid #cb2431',
                                borderRadius: 1,
                                p: 2,
                                overflow: 'auto',
                                maxHeight: 300,
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {error}
                        </Box>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            backgroundColor: '#f6f8fa',
                            border: '1px solid #d0d7de',
                            borderRadius: 1,
                            p: 2,
                            overflow: 'auto',
                            maxHeight: 400,
                        }}
                    >
                        {diff.split('\n').map(formatDiffLine)}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={pushing}>
                    Cancel
                </Button>
                <Button
                    onClick={handlePush}
                    variant="contained"
                    color="primary"
                    disabled={loading || pushing}
                >
                    Confirm & Push
                </Button>
            </DialogActions>
        </Dialog>
    );
}
