import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DirtyStateProvider } from './context/DirtyStateContext';
import { LocalNetworkProvider } from './context/LocalNetworkContext';
import './index.css';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalNetworkProvider>
                <DirtyStateProvider>
                    <App />
                </DirtyStateProvider>
            </LocalNetworkProvider>
        </ThemeProvider>
    </React.StrictMode>
);
