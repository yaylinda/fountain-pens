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
import { Pen } from '../../models/types';
import {
    addPen,
    deletePen,
    getAllPens,
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

// Type for sorting
type SortConfig = {
    key: keyof Pen;
    direction: 'asc' | 'desc';
} | null;

// Nib size comparison function
const compareNibSizes = (a: string, b: string): number => {
    // Extract numeric portion if it's in the format like "F", "EF", "M", "B", "BB", etc.
    const standardSizes = {
        UEF: 0,
        XXF: 1,
        EEF: 2,
        EF: 3,
        F: 4,
        M: 5,
        B: 6,
        BB: 7,
        BBB: 8,
        BBBB: 9,
    };

    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();

    const aSize = standardSizes[aUpper as keyof typeof standardSizes];
    const bSize = standardSizes[bUpper as keyof typeof standardSizes];

    // If both are standard sizes
    if (aSize !== undefined && bSize !== undefined) {
        return aSize - bSize;
    }

    // Try to extract numeric values (e.g., 0.3mm, 0.5mm)
    const aNumMatch = a.match(/(\d+(\.\d+)?)/);
    const bNumMatch = b.match(/(\d+(\.\d+)?)/);

    if (aNumMatch && bNumMatch) {
        return parseFloat(aNumMatch[0]) - parseFloat(bNumMatch[0]);
    }

    // Default to string comparison
    return a.localeCompare(b);
};

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

    useEffect(() => {
        loadPens();
    }, []);

    const loadPens = () => {
        const allPens = getAllPens();
        setPens(allPens);
    };

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

    // Color chips for pen colors
    const penColorColors = useMemo(() => {
        const colors = [
            ...new Set(pens.map((pen) => pen.color).filter(Boolean)),
        ];
        return colors.reduce((colorMap, color) => {
            colorMap[color] = stringToColor(color);
            return colorMap;
        }, {} as Record<string, string>);
    }, [pens]);

    // Get models that are used 2+ times
    const modelCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        pens.forEach((pen) => {
            counts[pen.model] = (counts[pen.model] || 0) + 1;
        });
        return counts;
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
    const requestSort = (key: keyof Pen) => {
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
                // Special handling for nibSize
                if (sortConfig.key === 'nibSize') {
                    const comparison = compareNibSizes(a.nibSize, b.nibSize);
                    return sortConfig.direction === 'asc'
                        ? comparison
                        : -comparison;
                }

                // Default string comparison for other keys
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
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
    }, [pens, sortConfig]);

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
    const getSortDirection = (key: keyof Pen) => {
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
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {isEditing ? 'Edit Pen' : 'Add New Pen'}
                </DialogTitle>
                <DialogContent>
                    <Autocomplete
                        freeSolo
                        options={uniqueBrands}
                        value={currentPen.brand || ''}
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
                        onChange={(event, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                brand: newValue || '',
                            }));
                        }}
                    />
                    <Autocomplete
                        freeSolo
                        options={uniqueModels}
                        value={currentPen.model || ''}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="dense"
                                label="Model"
                                required
                                fullWidth
                            />
                        )}
                        onChange={(event, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                model: newValue || '',
                            }));
                        }}
                    />
                    <TextField
                        margin="dense"
                        name="color"
                        label="Color"
                        type="text"
                        fullWidth
                        value={currentPen.color}
                        onChange={handleChange}
                    />
                    <Autocomplete
                        freeSolo
                        options={uniqueNibSizes}
                        value={currentPen.nibSize || ''}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="dense"
                                label="Nib Size"
                                fullWidth
                            />
                        )}
                        onChange={(event, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                nibSize: newValue || '',
                            }));
                        }}
                    />
                    <Autocomplete
                        freeSolo
                        options={uniqueNibTypes}
                        value={currentPen.nibType || ''}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="dense"
                                label="Nib Type"
                                fullWidth
                            />
                        )}
                        onChange={(event, newValue) => {
                            setCurrentPen((prev) => ({
                                ...prev,
                                nibType: newValue || '',
                            }));
                        }}
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

export default PensList;
