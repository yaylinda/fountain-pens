import { AppBar, Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import './App.css';
import InksList from './components/Inks/InksList';
import PensList from './components/Pens/PensList';
import RefillLogList from './components/RefillLog/RefillLogList';

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
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

function App() {
    const [value, setValue] = useState(0);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className="App">
            <AppBar
                position="static"
                color="primary"
            >
                <Container>
                    <Box sx={{ py: 2 }}>
                        <Typography
                            variant="h4"
                            component="h1"
                        >
                            Fountain Pen & Ink Manager
                        </Typography>
                    </Box>
                </Container>
            </AppBar>

            <Container>
                <Box sx={{ width: '100%', mt: 3 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={value}
                            onChange={handleChange}
                            aria-label="fountain pen app tabs"
                        >
                            <Tab label="Refill Log" />
                            <Tab label="Inks" />
                            <Tab label="Pens" />
                        </Tabs>
                    </Box>
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
            </Container>
        </div>
    );
}

export default App;
