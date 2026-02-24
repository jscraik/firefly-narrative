import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles.css';
import '../src/styles/firefly.css';
import { FireflyLanding } from './FireflyLanding';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <FireflyLanding />
    </StrictMode>,
);
