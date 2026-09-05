import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DirtyStateProvider } from './context/DirtyStateContext';
import { LocalNetworkProvider } from './context/LocalNetworkContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HashRouter>
            <LocalNetworkProvider>
                <DirtyStateProvider>
                    <App />
                </DirtyStateProvider>
            </LocalNetworkProvider>
        </HashRouter>
    </React.StrictMode>,
);
