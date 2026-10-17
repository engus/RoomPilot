import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { InterfaceProvider } from './i18n';

createRoot(document.getElementById('root')!).render(<React.StrictMode><InterfaceProvider><App /></InterfaceProvider></React.StrictMode>);
