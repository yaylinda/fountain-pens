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
import { Ink } from '../../models/types';
import {
    addInk,
    deleteInk,
    getAllInks,
    updateInk,
} from '../../services/dataService';

const InksList: React.FC = () => {
    const [inks, setInks] = useState<Ink[]>([]);
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentInk, setCurrentInk] = useState<Partial<Ink>>({
        brand: '',
        collection: '',
        name: '',
    });

    useEffect(() => {
        loadInks();
    }, []);

    const loadInks = () => {
        const allInks = getAllInks();
        setInks(allInks);
    };

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
        handleClose();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this ink?')) {
            deleteInk(id);
            loadInks();
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
                <h2>Inks Inventory</h2>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                >
                    Add Ink
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
                                <strong>Collection</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Name</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Actions</strong>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {inks.map((ink) => (
                            <TableRow key={ink.id}>
                                <TableCell>{ink.brand}</TableCell>
                                <TableCell>{ink.collection}</TableCell>
                                <TableCell>{ink.name}</TableCell>
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
                    <TextField
                        autoFocus
                        margin="dense"
                        name="brand"
                        label="Brand"
                        type="text"
                        fullWidth
                        value={currentInk.brand}
                        onChange={handleChange}
                        required
                    />
                    <TextField
                        margin="dense"
                        name="collection"
                        label="Collection"
                        type="text"
                        fullWidth
                        value={currentInk.collection}
                        onChange={handleChange}
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
        </div>
    );
};

export default InksList;
