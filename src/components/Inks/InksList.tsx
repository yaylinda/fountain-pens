import {
    Add as AddIcon,
    ArrowDownward as ArrowDownwardIcon,
    ArrowUpward as ArrowUpwardIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { Ink } from '../../models/types';
import { getInkUsageCount } from '../../services/countService';
import {
    addInk,
    deleteInk,
    getAllInks,
    getAllRefillLogs,
    getPenById,
    updateInk,
} from '../../services/dataService';

// Utility function to generate colors based on string
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 40%)`;
};

// Type for sorting
type SortConfig = {
    key: keyof Ink | 'usageCount' | 'dateInked';
    direction: 'asc' | 'desc';
} | null;

// Utility function to find all current pens for an ink and when it was inked into each
const getCurrentPensForInk = (inkId: string, refillLogs: any[]) => {
    // Get all unique pen IDs from refill logs
    const penIds = [...new Set(refillLogs.map((log) => log.penId))];
    const currentPens = [];

    for (const penId of penIds) {
        // Find the most recent refill for this specific pen
        const penLogs = refillLogs
            .filter((log) => log.penId === penId)
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
            );

        if (penLogs.length > 0) {
            const mostRecentLog = penLogs[0];
            // Check if this ink is in the most recent refill for this pen
            if (mostRecentLog.inkIds && mostRecentLog.inkIds.includes(inkId)) {
                const pen = getPenById(penId);
                if (pen) {
                    currentPens.push({ pen, date: mostRecentLog.date });
                }
            }
        }
    }

    return currentPens.length > 0 ? currentPens : null;
};

const InksList: React.FC = () => {
    const [inks, setInks] = useState<Ink[]>([]);
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentInk, setCurrentInk] = useState<Partial<Ink>>({
        brand: '',
        collection: '',
        name: '',
    });
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'brand',
        direction: 'asc',
    });
    const [refillLogs, setRefillLogs] = useState(
        getAllRefillLogs().map((log) => ({
            date: log.date,
            penId: log.penId,
            inkIds: log.inkIds,
            notes: log.notes,
        }))
    );

    useEffect(() => {
        loadInks();
        // Get refill logs for counting
        setRefillLogs(
            getAllRefillLogs().map((log) => ({
                date: log.date,
                penId: log.penId,
                inkIds: log.inkIds,
                notes: log.notes,
            }))
        );
    }, []);

    const loadInks = () => {
        const allInks = getAllInks();
        setInks(allInks);
    };

    // Calculate ink usage counts and current pen data
    const inkUsageData = useMemo(() => {
        return inks.reduce((acc, ink) => {
            const usageCount = getInkUsageCount(ink.id, refillLogs);
            const currentPensData = getCurrentPensForInk(ink.id, refillLogs);
            // For date sorting, use the most recent date if there are multiple pens
            const mostRecentDate = currentPensData
                ? currentPensData.sort(
                      (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                  )[0].date
                : null;

            acc[ink.id] = {
                usageCount,
                currentPens: currentPensData || [],
                dateInked: mostRecentDate,
            };
            return acc;
        }, {} as Record<string, { usageCount: number; currentPens: Array<{ pen: any; date: string }>; dateInked: string | null }>);
    }, [inks, refillLogs]);

    const handleOpen = (ink?: Ink) => {
        if (ink) {
            setCurrentInk(ink);
            setIsEditing(true);
        } else {
            setCurrentInk({ brand: '', collection: '', name: '' });
            setIsEditing(false);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentInk({ brand: '', collection: '', name: '' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentInk((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!currentInk.brand || !currentInk.name) {
            alert('Brand and name are required!');
            return;
        }

        if (isEditing && currentInk.id) {
            updateInk(currentInk as Ink);
        } else {
            addInk(currentInk as Omit<Ink, 'id'>);
        }

        loadInks();
        // Refresh refill logs as well
        setRefillLogs(
            getAllRefillLogs().map((log) => ({
                date: log.date,
                penId: log.penId,
                inkIds: log.inkIds,
                notes: log.notes,
            }))
        );
        handleClose();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this ink?')) {
            deleteInk(id);
            loadInks();
        }
    };

    // Create a unique set of brand and collection pairs
    const brandColors = useMemo(() => {
        const brands = [...new Set(inks.map((ink) => ink.brand))];
        return brands.reduce((colors, brand) => {
            colors[brand] = stringToColor(brand);
            return colors;
        }, {} as Record<string, string>);
    }, [inks]);

    const collectionColors = useMemo(() => {
        const collections = [
            ...new Set(inks.map((ink) => ink.collection).filter(Boolean)),
        ];
        return collections.reduce((colors, collection) => {
            colors[collection] = stringToColor(collection);
            return colors;
        }, {} as Record<string, string>);
    }, [inks]);

    // Handle sorting
    const requestSort = (key: keyof Ink | 'usageCount' | 'dateInked') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (
            sortConfig &&
            sortConfig.key === key &&
            sortConfig.direction === 'asc'
        ) {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Sort the inks
    const sortedInks = useMemo(() => {
        const sortableInks = [...inks];
        if (sortConfig !== null) {
            sortableInks.sort((a, b) => {
                // Special handling for usage count
                if (sortConfig.key === 'usageCount') {
                    const countA = inkUsageData[a.id]?.usageCount || 0;
                    const countB = inkUsageData[b.id]?.usageCount || 0;
                    return sortConfig.direction === 'asc'
                        ? countA - countB
                        : countB - countA;
                }

                // Special handling for date inked
                if (sortConfig.key === 'dateInked') {
                    const dateA = inkUsageData[a.id]?.dateInked;
                    const dateB = inkUsageData[b.id]?.dateInked;

                    // Handle cases where date might be null
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1; // Put nulls at the end
                    if (!dateB) return -1;

                    const timeA = new Date(dateA).getTime();
                    const timeB = new Date(dateB).getTime();

                    return sortConfig.direction === 'asc'
                        ? timeA - timeB
                        : timeB - timeA;
                }

                // Default string comparison for other keys
                if (
                    a[sortConfig.key as keyof Ink] <
                    b[sortConfig.key as keyof Ink]
                ) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (
                    a[sortConfig.key as keyof Ink] >
                    b[sortConfig.key as keyof Ink]
                ) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                // If primary sort key is equal, sort by brand, then collection, then name
                if (sortConfig.key !== 'brand' && a.brand !== b.brand) {
                    return a.brand < b.brand ? -1 : 1;
                }
                if (
                    sortConfig.key !== 'collection' &&
                    a.collection !== b.collection
                ) {
                    return a.collection < b.collection ? -1 : 1;
                }
                if (sortConfig.key !== 'name' && a.name !== b.name) {
                    return a.name < b.name ? -1 : 1;
                }
                return 0;
            });
        }
        return sortableInks;
    }, [inks, sortConfig, inkUsageData]);

    // Default display sorting (brand, collection, name)
    const displaySortedInks = useMemo(() => {
        // Deepcopy to prevent side effects
        const displayInks = [...sortedInks];

        // If no explicit sorting, sort by brand, then collection, then name
        if (!sortConfig) {
            return displayInks.sort((a, b) => {
                if (a.brand !== b.brand) {
                    return a.brand.localeCompare(b.brand);
                }
                if (a.collection !== b.collection) {
                    return a.collection.localeCompare(b.collection);
                }
                return a.name.localeCompare(b.name);
            });
        }

        return displayInks;
    }, [sortedInks, sortConfig]);

    // Render the sort direction indicator
    const getSortDirection = (key: keyof Ink | 'usageCount' | 'dateInked') => {
        if (!sortConfig || sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'asc' ? (
            <ArrowUpwardIcon fontSize="small" />
        ) : (
            <ArrowDownwardIcon fontSize="small" />
        );
    };

    // Extract unique brands and collections
    const uniqueBrands = useMemo(() => {
        return [...new Set(inks.map((ink) => ink.brand))].sort();
    }, [inks]);

    const uniqueCollections = useMemo(() => {
        return [
            ...new Set(inks.map((ink) => ink.collection).filter(Boolean)),
        ].sort();
    }, [inks]);

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                px: 2,
                pb: 2,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pt: 2,
                    pb: 1,
                }}
            >
                <Typography variant="h6">Inks Inventory</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    size="small"
                >
                    Add Ink
                </Button>
            </Box>

            <TableContainer
                component={Paper}
                sx={{
                    flexGrow: 1,
                    height: 'calc(100% - 56px)',
                    overflow: 'auto',
                }}
            >
                <Table
                    stickyHeader
                    size="small"
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                onClick={() => requestSort('brand')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Brand</strong>
                                    {getSortDirection('brand')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('collection')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Collection</strong>
                                    {getSortDirection('collection')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('name')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Name</strong>
                                    {getSortDirection('name')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('usageCount')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Usage Count</strong>
                                    {getSortDirection('usageCount')}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <strong>Current Pens</strong>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('dateInked')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Date Inked</strong>
                                    {getSortDirection('dateInked')}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <strong>Actions</strong>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displaySortedInks.map((ink) => (
                            <TableRow key={ink.id}>
                                <TableCell>
                                    <Chip
                                        label={ink.brand}
                                        sx={{
                                            bgcolor: brandColors[ink.brand],
                                            color: 'white',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    {ink.collection && (
                                        <Chip
                                            label={ink.collection}
                                            sx={{
                                                bgcolor:
                                                    collectionColors[
                                                        ink.collection
                                                    ],
                                                color: 'white',
                                                fontWeight: 'bold',
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>{ink.name}</TableCell>
                                <TableCell align="center">
                                    {inkUsageData[ink.id]?.usageCount || 0}
                                </TableCell>
                                <TableCell>
                                    {inkUsageData[ink.id]?.currentPens.length >
                                    0 ? (
                                        <Box>
                                            {inkUsageData[
                                                ink.id
                                            ].currentPens.map(
                                                (penData, index) => (
                                                    <Box
                                                        key={penData.pen.id}
                                                        sx={{
                                                            mb:
                                                                index <
                                                                inkUsageData[
                                                                    ink.id
                                                                ].currentPens
                                                                    .length -
                                                                    1
                                                                    ? 1
                                                                    : 0,
                                                        }}
                                                    >
                                                        <Box>
                                                            <strong>
                                                                {
                                                                    penData.pen
                                                                        .brand
                                                                }
                                                            </strong>{' '}
                                                            {penData.pen.model}
                                                            {penData.pen
                                                                .color &&
                                                                ` (${penData.pen.color})`}
                                                        </Box>
                                                        <Box
                                                            sx={{
                                                                fontSize:
                                                                    '0.8em',
                                                                color: '#666',
                                                            }}
                                                        >
                                                            {new Date(
                                                                penData.date
                                                            ).toLocaleDateString()}
                                                        </Box>
                                                    </Box>
                                                )
                                            )}
                                        </Box>
                                    ) : (
                                        <em style={{ color: '#999' }}>
                                            Not currently inked
                                        </em>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {inkUsageData[ink.id]?.dateInked ? (
                                        new Date(
                                            inkUsageData[ink.id].dateInked!
                                        ).toLocaleDateString()
                                    ) : (
                                        <em style={{ color: '#999' }}>-</em>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleOpen(ink)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(ink.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle>
                    {isEditing ? 'Edit Ink' : 'Add New Ink'}
                </DialogTitle>
                <DialogContent>
                    <Autocomplete
                        freeSolo
                        options={uniqueBrands}
                        value={currentInk.brand || ''}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                autoFocus
                                margin="dense"
                                label="Brand"
                                required
                                fullWidth
                            />
                        )}
                        onChange={(_, newValue) => {
                            setCurrentInk((prev) => ({
                                ...prev,
                                brand: newValue || '',
                            }));
                        }}
                    />
                    <Autocomplete
                        freeSolo
                        options={uniqueCollections}
                        value={currentInk.collection || ''}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="dense"
                                label="Collection"
                                fullWidth
                            />
                        )}
                        onChange={(_, newValue) => {
                            setCurrentInk((prev) => ({
                                ...prev,
                                collection: newValue || '',
                            }));
                        }}
                    />
                    <TextField
                        margin="dense"
                        name="name"
                        label="Name"
                        type="text"
                        fullWidth
                        value={currentInk.name}
                        onChange={handleChange}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleClose}
                        color="primary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        color="primary"
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InksList;
