import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AuthGate } from './components/AuthGate';
import './index.css';

const router = createHashRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthGate>
                <RouterProvider router={router} />
            </AuthGate>
    </React.StrictMode>,
);
