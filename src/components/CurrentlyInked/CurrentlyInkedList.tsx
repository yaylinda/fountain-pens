import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    SelectChangeEvent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from '@mui/material';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
    CurrentlyInked,
    CurrentlyInkedDisplay,
    Ink,
    Pen,
} from '../../models/types';
import {
    addCurrentlyInked,
    deleteCurrentlyInked,
    getAllCurrentlyInked,
    getAllInks,
    getAllPens,
    updateCurrentlyInked,
} from '../../services/dataService';

const CurrentlyInkedList: React.FC = () => {
    const [currentlyInked, setCurrentlyInked] = useState<
        CurrentlyInkedDisplay[]
    >([]);
    const [pens, setPens] = useState<Pen[]>([]);
    const [inks, setInks] = useState<Ink[]>([]);
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<CurrentlyInked>>({
        date: format(new Date(), 'yyyy-MM-dd'),
        penId: '',
        inkIds: [],
        notes: '',
    });

    useEffect(() => {
        loadCurrentlyInked();
        setPens(getAllPens());
        setInks(getAllInks());
    }, []);

    const loadCurrentlyInked = () => {
        const allCurrentlyInked = getAllCurrentlyInked();
        setCurrentlyInked(allCurrentlyInked);
    };

    const handleOpen = (item?: CurrentlyInkedDisplay) => {
        if (item) {
            const { id, date, penId, inkIds, notes } = item;
            setCurrentItem({ id, date, penId, inkIds, notes });
            setIsEditing(true);
        } else {
            setCurrentItem({
                date: format(new Date(), 'yyyy-MM-dd'),
                penId: '',
                inkIds: [],
                notes: '',
            });
            setIsEditing(false);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentItem({
            date: format(new Date(), 'yyyy-MM-dd'),
            penId: '',
            inkIds: [],
            notes: '',
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentItem((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setCurrentItem((prev) => ({ ...prev, [name]: value }));
    };

    const handleInkSelectChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value },
        } = event;
        setCurrentItem((prev) => ({
            ...prev,
            inkIds: typeof value === 'string' ? value.split(',') : value,
        }));
    };

    const handleSave = () => {
        if (
            !currentItem.penId ||
            !currentItem.inkIds?.length ||
            !currentItem.date
        ) {
            alert('Pen, at least one ink, and date are required!');
            return;
        }

        if (isEditing && currentItem.id) {
            updateCurrentlyInked(currentItem as CurrentlyInked);
        } else {
            addCurrentlyInked(currentItem as Omit<CurrentlyInked, 'id'>);
        }

        loadCurrentlyInked();
        handleClose();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            deleteCurrentlyInked(id);
            loadCurrentlyInked();
        }
    };

    const getPenDisplayText = (pen: Pen) => {
        return `${pen.brand} ${pen.model} - ${pen.color} (${pen.nibSize})`;
    };

    const getInkDisplayText = (ink: Ink) => {
        return `${ink.brand} ${ink.name}${
            ink.collection ? ` (${ink.collection})` : ''
        }`;
    };

    const renderInks = (inkDetails: Ink[]) => {
        return (
            <div>
                {inkDetails.map((ink, index) => (
                    <Chip
                        key={ink.id}
                        label={getInkDisplayText(ink)}
                        color="primary"
                        variant="outlined"
                        style={{ margin: '2px' }}
                    />
                ))}
            </div>
        );
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
                <h2>Currently Inked Pens</h2>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                >
                    Add Inked Pen
                </Button>
            </div>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <strong>Date</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Pen</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Inks</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Notes</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Actions</strong>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {currentlyInked.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.date}</TableCell>
                                <TableCell>
                                    {getPenDisplayText(item.penDetails)}
                                </TableCell>
                                <TableCell>
                                    {renderInks(item.inkDetails)}
                                </TableCell>
                                <TableCell>{item.notes}</TableCell>
                                <TableCell>
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleOpen(item)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(item.id)}
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
                    {isEditing ? 'Edit Inked Pen' : 'Add New Inked Pen'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        name="date"
                        label="Date"
                        type="date"
                        fullWidth
                        value={currentItem.date}
                        onChange={handleInputChange}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        required
                    />

                    <FormControl
                        fullWidth
                        margin="dense"
                        required
                    >
                        <InputLabel id="pen-select-label">Pen</InputLabel>
                        <Select
                            labelId="pen-select-label"
                            name="penId"
                            value={currentItem.penId}
                            onChange={handleSelectChange}
                            label="Pen"
                        >
                            {pens.map((pen) => (
                                <MenuItem
                                    key={pen.id}
                                    value={pen.id}
                                >
                                    {getPenDisplayText(pen)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl
                        fullWidth
                        margin="dense"
                        required
                    >
                        <InputLabel id="ink-select-label">Inks</InputLabel>
                        <Select
                            labelId="ink-select-label"
                            multiple
                            name="inkIds"
                            value={currentItem.inkIds || []}
                            onChange={handleInkSelectChange}
                            input={<OutlinedInput label="Inks" />}
                            renderValue={(selected) => (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 0.5,
                                    }}
                                >
                                    {(selected as string[]).map((value) => {
                                        const ink = inks.find(
                                            (i) => i.id === value
                                        );
                                        return ink ? (
                                            <Chip
                                                key={value}
                                                label={getInkDisplayText(ink)}
                                            />
                                        ) : null;
                                    })}
                                </Box>
                            )}
                        >
                            {inks.map((ink) => (
                                <MenuItem
                                    key={ink.id}
                                    value={ink.id}
                                >
                                    {getInkDisplayText(ink)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        margin="dense"
                        name="notes"
                        label="Notes"
                        type="text"
                        fullWidth
                        multiline
                        rows={3}
                        value={currentItem.notes}
                        onChange={handleInputChange}
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

export default CurrentlyInkedList;
