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
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { Ink, Pen } from '../../models/types';
import {
    getMostRecentInkDateForPen,
    getMostRecentInkForPen,
    getPenRefillCount,
} from '../../services/countService';
import {
    addPen,
    deletePen,
    getAllPens,
    getAllRefillLogs,
    getInkById,
    updatePen,
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

// Utility for Nib size comparison
const nibSizeOrder = [
    'EF',
    'F',
    'M',
    'B',
    'BB',
    'BBB',
    'BBBB',
    'Stub',
    'Italic',
    'Music',
    'Fude',
];

const compareNibSizes = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    const aIdx = nibSizeOrder.findIndex((size) =>
        a.toUpperCase().includes(size)
    );
    const bIdx = nibSizeOrder.findIndex((size) =>
        b.toUpperCase().includes(size)
    );

    if (aIdx >= 0 && bIdx >= 0) {
        return aIdx - bIdx;
    } else if (aIdx >= 0) {
        return -1;
    } else if (bIdx >= 0) {
        return 1;
    } else {
        return a.localeCompare(b);
    }
};

// Type for sorting
type SortConfig = {
    key: keyof Pen | 'refillCount' | 'currentInk' | 'dateInked';
    direction: 'asc' | 'desc';
} | null;

const PensList: React.FC = () => {
    const [pens, setPens] = useState<Pen[]>([]);
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPen, setCurrentPen] = useState<Partial<Pen>>({
        brand: '',
        model: '',
        color: '',
        nibSize: '',
        nibType: '',
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
        loadPens();
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

    const loadPens = () => {
        const allPens = getAllPens();
        setPens(allPens);
    };

    // Calculate pen refill counts and current ink
    const penRefillData = useMemo(() => {
        return pens.reduce((acc, pen) => {
            const refillCount = getPenRefillCount(pen.id, refillLogs);
            const currentInkId = getMostRecentInkForPen(pen.id, refillLogs);
            const currentInk = currentInkId
                ? getInkById(currentInkId)
                : undefined;
            const dateInked = getMostRecentInkDateForPen(pen.id, refillLogs);

            acc[pen.id] = {
                refillCount,
                currentInkId,
                currentInk,
                dateInked,
            };

            return acc;
        }, {} as Record<string, { refillCount: number; currentInkId?: string; currentInk?: Ink; dateInked?: string }>);
    }, [pens, refillLogs]);

    const handleOpen = (pen?: Pen) => {
        if (pen) {
            setCurrentPen(pen);
            setIsEditing(true);
        } else {
            setCurrentPen({
                brand: '',
                model: '',
                color: '',
                nibSize: '',
                nibType: '',
            });
            setIsEditing(false);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentPen({
            brand: '',
            model: '',
            color: '',
            nibSize: '',
            nibType: '',
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentPen((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!currentPen.brand || !currentPen.model) {
            alert('Brand and model are required!');
            return;
        }

        if (isEditing && currentPen.id) {
            updatePen(currentPen as Pen);
        } else {
            addPen(currentPen as Omit<Pen, 'id'>);
        }

        loadPens();
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
        if (window.confirm('Are you sure you want to delete this pen?')) {
            deletePen(id);
            loadPens();
        }
    };

    // Create color maps for the chips
    const brandColors = useMemo(() => {
        const brands = [...new Set(pens.map((pen) => pen.brand))];
        return brands.reduce((colors, brand) => {
            colors[brand] = stringToColor(brand);
            return colors;
        }, {} as Record<string, string>);
    }, [pens]);

    // Model colors for all models
    const modelColors = useMemo(() => {
        const models = [...new Set(pens.map((pen) => pen.model))];
        return models.reduce((colors, model) => {
            colors[model] = stringToColor(model);
            return colors;
        }, {} as Record<string, string>);
    }, [pens]);

    const nibSizeColors = useMemo(() => {
        const nibSizes = [
            ...new Set(pens.map((pen) => pen.nibSize).filter(Boolean)),
        ];
        return nibSizes.reduce((colors, size) => {
            colors[size] = stringToColor(size);
            return colors;
        }, {} as Record<string, string>);
    }, [pens]);

    const nibTypeColors = useMemo(() => {
        const nibTypes = [
            ...new Set(pens.map((pen) => pen.nibType).filter(Boolean)),
        ];
        return nibTypes.reduce((colors, type) => {
            colors[type] = stringToColor(type);
            return colors;
        }, {} as Record<string, string>);
    }, [pens]);

    // Handle sorting
    const requestSort = (
        key: keyof Pen | 'refillCount' | 'currentInk' | 'dateInked'
    ) => {
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

    // Sort the pens
    const sortedPens = useMemo(() => {
        const sortablePens = [...pens];
        if (sortConfig !== null) {
            sortablePens.sort((a, b) => {
                // Special handling for custom sort keys
                if (sortConfig.key === 'refillCount') {
                    const countA = penRefillData[a.id]?.refillCount || 0;
                    const countB = penRefillData[b.id]?.refillCount || 0;
                    return sortConfig.direction === 'asc'
                        ? countA - countB
                        : countB - countA;
                }

                if (sortConfig.key === 'currentInk') {
                    const inkA = penRefillData[a.id]?.currentInk?.name || '';
                    const inkB = penRefillData[b.id]?.currentInk?.name || '';
                    return sortConfig.direction === 'asc'
                        ? inkA.localeCompare(inkB)
                        : inkB.localeCompare(inkA);
                }

                // Special handling for date inked
                if (sortConfig.key === 'dateInked') {
                    const dateA = penRefillData[a.id]?.dateInked;
                    const dateB = penRefillData[b.id]?.dateInked;

                    // Handle cases where date might be null/undefined
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1; // Put nulls at the end
                    if (!dateB) return -1;

                    const timeA = new Date(dateA).getTime();
                    const timeB = new Date(dateB).getTime();

                    return sortConfig.direction === 'asc'
                        ? timeA - timeB
                        : timeB - timeA;
                }

                // Special handling for nibSize
                if (sortConfig.key === 'nibSize') {
                    const comparison = compareNibSizes(a.nibSize, b.nibSize);
                    return sortConfig.direction === 'asc'
                        ? comparison
                        : -comparison;
                }

                // Default string comparison for other keys
                if (
                    a[sortConfig.key as keyof Pen] <
                    b[sortConfig.key as keyof Pen]
                ) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (
                    a[sortConfig.key as keyof Pen] >
                    b[sortConfig.key as keyof Pen]
                ) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }

                // If primary sort key is equal, sort by brand, then model, then nibSize
                if (sortConfig.key !== 'brand' && a.brand !== b.brand) {
                    return a.brand.localeCompare(b.brand);
                }
                if (sortConfig.key !== 'model' && a.model !== b.model) {
                    return a.model.localeCompare(b.model);
                }
                // Need to use a type assertion here to avoid TypeScript error
                if (
                    (sortConfig.key as string) !== 'nibSize' &&
                    a.nibSize !== b.nibSize
                ) {
                    return compareNibSizes(a.nibSize, b.nibSize);
                }
                return 0;
            });
        }
        return sortablePens;
    }, [pens, sortConfig, penRefillData]);

    // Default display sorting (brand, model, nibSize)
    const displaySortedPens = useMemo(() => {
        // Deepcopy to prevent side effects
        const displayPens = [...sortedPens];

        // If no explicit sorting, sort by brand, then model, then nibSize
        if (!sortConfig) {
            return displayPens.sort((a, b) => {
                if (a.brand !== b.brand) {
                    return a.brand.localeCompare(b.brand);
                }
                if (a.model !== b.model) {
                    return a.model.localeCompare(b.model);
                }
                return compareNibSizes(a.nibSize, b.nibSize);
            });
        }

        return displayPens;
    }, [sortedPens, sortConfig]);

    // Render the sort direction indicator
    const getSortDirection = (
        key: keyof Pen | 'refillCount' | 'currentInk' | 'dateInked'
    ) => {
        if (!sortConfig || sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'asc' ? (
            <ArrowUpwardIcon fontSize="small" />
        ) : (
            <ArrowDownwardIcon fontSize="small" />
        );
    };

    // Extract unique values for dropdowns
    const uniqueBrands = useMemo(() => {
        return [...new Set(pens.map((pen) => pen.brand))].sort();
    }, [pens]);

    const uniqueModels = useMemo(() => {
        return [...new Set(pens.map((pen) => pen.model))].sort();
    }, [pens]);

    const uniqueNibSizes = useMemo(() => {
        return [
            ...new Set(pens.map((pen) => pen.nibSize).filter(Boolean)),
        ].sort();
    }, [pens]);

    const uniqueNibTypes = useMemo(() => {
        return [
            ...new Set(pens.map((pen) => pen.nibType).filter(Boolean)),
        ].sort();
    }, [pens]);

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
                <Typography variant="h6">Pens Inventory</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    size="small"
                >
                    Add Pen
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
                                onClick={() => requestSort('model')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Model</strong>
                                    {getSortDirection('model')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('color')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Color</strong>
                                    {getSortDirection('color')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('nibSize')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Nib Size</strong>
                                    {getSortDirection('nibSize')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('nibType')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Nib Type</strong>
                                    {getSortDirection('nibType')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('refillCount')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Refill Count</strong>
                                    {getSortDirection('refillCount')}
                                </Box>
                            </TableCell>
                            <TableCell
                                onClick={() => requestSort('currentInk')}
                                style={{ cursor: 'pointer' }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <strong>Current Ink</strong>
                                    {getSortDirection('currentInk')}
                                </Box>
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
                        {displaySortedPens.map((pen) => (
                            <TableRow key={pen.id}>
                                <TableCell>
                                    <Chip
                                        label={pen.brand}
                                        sx={{
                                            bgcolor: brandColors[pen.brand],
                                            color: 'white',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={pen.model}
                                        sx={{
                                            bgcolor: modelColors[pen.model],
                                            color: 'white',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                </TableCell>
                                <TableCell>{pen.color}</TableCell>
                                <TableCell>
                                    {pen.nibSize && (
                                        <Chip
                                            label={pen.nibSize}
                                            sx={{
                                                bgcolor:
                                                    nibSizeColors[pen.nibSize],
                                                color: 'white',
                                                fontWeight: 'bold',
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {pen.nibType && (
                                        <Chip
                                            label={pen.nibType}
                                            sx={{
                                                bgcolor:
                                                    nibTypeColors[pen.nibType],
                                                color: 'white',
                                                fontWeight: 'bold',
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    {penRefillData[pen.id]?.refillCount || 0}
                                </TableCell>
                                <TableCell>
                                    {penRefillData[pen.id]?.currentInk ? (
                                        <Tooltip
                                            title={`${
                                                penRefillData[pen.id].currentInk
                                                    ?.brand
                                            } ${
                                                penRefillData[pen.id].currentInk
                                                    ?.collection
                                                    ? penRefillData[pen.id]
                                                          .currentInk
                                                          ?.collection + ' '
                                                    : ''
                                            }${
                                                penRefillData[pen.id].currentInk
                                                    ?.name
                                            }`}
                                        >
                                            <Chip
                                                label={
                                                    penRefillData[pen.id]
                                                        .currentInk?.name
                                                }
                                                size="small"
                                                sx={{
                                                    bgcolor: stringToColor(
                                                        penRefillData[pen.id]
                                                            .currentInk
                                                            ?.brand || ''
                                                    ),
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                }}
                                            />
                                        </Tooltip>
                                    ) : (
                                        <span style={{ color: '#999' }}>
                                            None
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {penRefillData[pen.id]?.dateInked ? (
                                        new Date(
                                            penRefillData[pen.id].dateInked!
                                        ).toLocaleDateString()
                                    ) : (
                                        <em style={{ color: '#999' }}>-</em>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleOpen(pen)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(pen.id)}
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
                    {isEditing ? 'Edit Pen' : 'Add New Pen'}
                </DialogTitle>
                <DialogContent>
                    <Autocomplete
                        id="brand"
                        freeSolo
                        options={uniqueBrands}
                        value={currentPen.brand}
                        onChange={(_, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                brand: newValue || '',
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                name="brand"
                                label="Brand"
                                margin="normal"
                                required
                                fullWidth
                                onChange={handleChange}
                            />
                        )}
                    />
                    <Autocomplete
                        id="model"
                        freeSolo
                        options={uniqueModels}
                        value={currentPen.model}
                        onChange={(_, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                model: newValue || '',
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                name="model"
                                label="Model"
                                margin="normal"
                                required
                                fullWidth
                                onChange={handleChange}
                            />
                        )}
                    />
                    <TextField
                        name="color"
                        label="Color"
                        value={currentPen.color || ''}
                        onChange={handleChange}
                        margin="normal"
                        fullWidth
                    />
                    <Autocomplete
                        id="nibSize"
                        freeSolo
                        options={uniqueNibSizes}
                        value={currentPen.nibSize || ''}
                        onChange={(_, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                nibSize: newValue || '',
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                name="nibSize"
                                label="Nib Size"
                                margin="normal"
                                fullWidth
                                onChange={handleChange}
                            />
                        )}
                    />
                    <Autocomplete
                        id="nibType"
                        freeSolo
                        options={uniqueNibTypes}
                        value={currentPen.nibType || ''}
                        onChange={(_, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                nibType: newValue || '',
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                name="nibType"
                                label="Nib Type"
                                margin="normal"
                                fullWidth
                                onChange={handleChange}
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        color="primary"
                    >
                        {isEditing ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PensList;
