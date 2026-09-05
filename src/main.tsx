import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { DirtyStateProvider } from './context/DirtyStateContext';
import { LocalNetworkProvider } from './context/LocalNetworkContext';
import './index.css';

const router = createHashRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <LocalNetworkProvider>
            <DirtyStateProvider>
                <RouterProvider router={router} />
            </DirtyStateProvider>
        </LocalNetworkProvider>
    </React.StrictMode>,
);
