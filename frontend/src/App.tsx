import React from 'react';
import {
  IonApp,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import {
  gridOutline,
  cubeOutline,
  peopleOutline,
  sparklesOutline,
  heartOutline,
  documentTextOutline,
  pulseOutline,
} from 'ionicons/icons';

import Dashboard   from './pages/Dashboard';
import Inventory   from './pages/Inventory';
import Clients     from './pages/Clients';
import AIIntake    from './pages/AIIntake';
import Volunteers  from './pages/Volunteers';
import Drafts      from './pages/Drafts';
import EventLog    from './pages/EventLog';

setupIonicReact({ mode: 'md' });

const NAV = [
  { title: 'Dashboard',  path: '/dashboard',  icon: gridOutline,         component: Dashboard  },
  { title: 'Inventory',  path: '/inventory',  icon: cubeOutline,         component: Inventory  },
  { title: 'Clients',    path: '/clients',    icon: peopleOutline,       component: Clients    },
  { title: 'AI Intake',  path: '/intake',     icon: sparklesOutline,     component: AIIntake   },
  { title: 'Volunteers', path: '/volunteers', icon: heartOutline,        component: Volunteers },
  { title: 'Drafts',     path: '/drafts',     icon: documentTextOutline, component: Drafts     },
  { title: 'Event Log',  path: '/eventlog',   icon: pulseOutline,        component: EventLog   },
];

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonSplitPane contentId="main">

        {/* ── Sidebar ──────────────────────────────────── */}
        <IonMenu contentId="main" type="overlay">
          <div className="sidebar-brand">
            <div className="brand-icon-wrap">
              <IonIcon icon={pulseOutline} />
            </div>
            <div>
              <p className="brand-name">C.O.R.E.</p>
              <p className="brand-sub">Project Dignity Hobbs</p>
            </div>
          </div>

          <IonContent>
            <IonList lines="none" className="nav-list">
              {NAV.map((item) => (
                <IonMenuToggle key={item.path} autoHide={false}>
                  <IonItem
                    routerLink={item.path}
                    routerDirection="none"
                    detail={false}
                    className="nav-item"
                  >
                    <IonIcon slot="start" icon={item.icon} />
                    <IonLabel>{item.title}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
              ))}
            </IonList>
          </IonContent>
        </IonMenu>

        {/* ── Page outlet ──────────────────────────────── */}
        <IonRouterOutlet id="main">
          {NAV.map((item) => (
            <Route
              exact
              path={item.path}
              component={item.component}
              key={item.path}
            />
          ))}
          <Redirect exact from="/" to="/dashboard" />
        </IonRouterOutlet>

      </IonSplitPane>
    </IonReactRouter>
  </IonApp>
);

export default App;
