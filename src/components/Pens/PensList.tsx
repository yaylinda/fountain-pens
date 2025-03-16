import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import {
    Button,
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
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Pen } from '../../models/types';
import {
    addPen,
    deletePen,
    getAllPens,
    updatePen,
} from '../../services/dataService';

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

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    margin: '20px 0',
                }}
            >
                <h2>Pens Inventory</h2>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                >
                    Add Pen
                </Button>
            </div>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <strong>Brand</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Model</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Color</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Nib Size</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Nib Type</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Actions</strong>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pens.map((pen) => (
                            <TableRow key={pen.id}>
                                <TableCell>{pen.brand}</TableCell>
                                <TableCell>{pen.model}</TableCell>
                                <TableCell>{pen.color}</TableCell>
                                <TableCell>{pen.nibSize}</TableCell>
                                <TableCell>{pen.nibType}</TableCell>
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
                    <TextField
                        autoFocus
                        margin="dense"
                        name="brand"
                        label="Brand"
                        type="text"
                        fullWidth
                        value={currentPen.brand}
                        onChange={handleChange}
                        required
                    />
                    <TextField
                        margin="dense"
                        name="model"
                        label="Model"
                        type="text"
                        fullWidth
                        value={currentPen.model}
                        onChange={handleChange}
                        required
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
                    <TextField
                        margin="dense"
                        name="nibSize"
                        label="Nib Size"
                        type="text"
                        fullWidth
                        value={currentPen.nibSize}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        name="nibType"
                        label="Nib Type"
                        type="text"
                        fullWidth
                        value={currentPen.nibType}
                        onChange={handleChange}
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
        </div>
    );
};

export default PensList;
