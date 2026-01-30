import {
    AppBar,
    Box,
    CircularProgress,
    CssBaseline,
    Tab,
    Tabs,
    Toolbar,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import './App.css';
import InksList from './components/Inks/InksList';
import PensList from './components/Pens/PensList';
import RefillLogList from './components/RefillLog/RefillLogList';
import { loadData } from './services/dataService';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            style={{ height: '100%', overflow: 'hidden' }}
            {...other}
        >
            {value === index && (
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function App() {
    const [value, setValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData()
            .then(() => {
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load data:', err);
                setError('Failed to load data. Please refresh the page.');
                setLoading(false);
            });
    }, []);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    color: 'error.main',
                }}
            >
                <Typography variant="h6">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
            }}
        >
            <CssBaseline />
            <AppBar
                position="static"
                color="primary"
            >
                <Toolbar variant="dense">
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1 }}
                    >
                        Fountain Pen & Ink Manager
                    </Typography>
                    <Tabs
                        value={value}
                        onChange={handleChange}
                        aria-label="fountain pen app tabs"
                        textColor="inherit"
                        indicatorColor="secondary"
                    >
                        <Tab label="Refill Log" />
                        <Tab label="Inks" />
                        <Tab label="Pens" />
                    </Tabs>
                </Toolbar>
            </AppBar>

            <Box
                sx={{
                    flexGrow: 1,
                    overflow: 'hidden',
                    height: 'calc(100vh - 48px)', // 48px is the dense Toolbar height
                }}
            >
                <TabPanel
                    value={value}
                    index={0}
                >
                    <RefillLogList />
                </TabPanel>
                <TabPanel
                    value={value}
                    index={1}
                >
                    <InksList />
                </TabPanel>
                <TabPanel
                    value={value}
                    index={2}
                >
                    <PensList />
                </TabPanel>
            </Box>
        </Box>
    );
}

export default App;
