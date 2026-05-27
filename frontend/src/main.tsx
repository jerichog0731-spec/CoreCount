import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/* Core Ionic CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional Ionic CSS Utilities */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* CoreCount dark theme */
import './theme/variables.css';

const container = document.getElementById('root')!;
createRoot(container).render(<App />);
