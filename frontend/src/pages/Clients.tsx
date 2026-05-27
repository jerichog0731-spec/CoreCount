import React, { useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonCard, IonCardContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonToast, IonGrid, IonRow, IonCol,
} from '@ionic/react';
import { apiGet, apiPost, type Client, type Eligibility } from '../hooks/useApi';

type ClientResp = { client: Client; eligibility: Record<string, Eligibility> };
type NewClientResp = { client: Client };

const CATS = ['Hygiene', 'Laundry', 'Cleaning', 'Special'];

const Clients: React.FC = () => {
  const [firstName, setFirstName]       = useState('');
  const [familySize, setFamilySize]     = useState('1');
  const [newClient, setNewClient]       = useState<Client | null>(null);
  const [lookupId, setLookupId]         = useState('');
  const [lookupResult, setLookupResult] = useState<ClientResp | null>(null);
  const [toast, setToast]               = useState({ show: false, msg: '', color: 'success' });

  const showToast = (msg: string, color = 'success') => setToast({ show: true, msg, color });

  const register = async () => {
    if (!firstName.trim()) { showToast('First name is required.', 'danger'); return; }
    try {
      const data = await apiPost<NewClientResp>('/clients', {
        firstName: firstName.trim(),
        familySize: parseInt(familySize) || 1,
      });
      setNewClient(data.client);
      setFirstName(''); setFamilySize('1');
      showToast(`Client ${data.client.client_id} registered!`);
    } catch (e) { showToast(String(e), 'danger'); }
  };

  const lookup = async () => {
    if (!lookupId.trim()) return;
    try {
      const data = await apiGet<ClientResp>(`/clients/${lookupId.trim()}`);
      setLookupResult(data);
    } catch (e) { showToast(String(e), 'danger'); setLookupResult(null); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Clients</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="content-wrap">
          <p className="page-title">Clients</p>
          <p className="page-sub">Register anonymous client profiles and check eligibility</p>

          <IonGrid className="ion-no-padding">
            <IonRow>
              {/* Register */}
              <IonCol size="12" sizeMd="6" style={{ paddingRight: 8 }}>
                <IonCard>
                  <IonCardContent>
                    <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 12, fontSize: 14 }}>
                      Register New Client
                    </p>
                    <IonList lines="inset">
                      <IonItem>
                        <IonLabel position="stacked">First Name *</IonLabel>
                        <IonInput value={firstName} placeholder="First name only"
                          onIonInput={e => setFirstName(e.detail.value!)} />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Family Size *</IonLabel>
                        <IonInput type="number" value={familySize} min="1" placeholder="1"
                          onIonInput={e => setFamilySize(e.detail.value!)} />
                      </IonItem>
                    </IonList>
                    <IonButton expand="block" color="primary" style={{ marginTop: 14 }} onClick={register}>
                      Generate Digital Card
                    </IonButton>

                    {newClient && (
                      <div style={{ marginTop: 16, padding: '14px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em' }}>
                          {newClient.client_id}
                        </div>
                        <div style={{ fontSize: 13, color: '#9898b8', marginTop: 6 }}>
                          👤 {newClient.first_name} · Family of {newClient.family_size}
                        </div>
                        <div style={{ fontSize: 11, color: '#5a5a7a', marginTop: 4 }}>
                          All categories eligible ✅
                        </div>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>

              {/* Look Up */}
              <IonCol size="12" sizeMd="6">
                <IonCard>
                  <IonCardContent>
                    <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 12, fontSize: 14 }}>
                      Look Up Client
                    </p>
                    <IonList lines="inset">
                      <IonItem>
                        <IonLabel position="stacked">Client ID</IonLabel>
                        <IonInput value={lookupId} placeholder="PDH-XXXXXXXX"
                          onIonInput={e => setLookupId(e.detail.value!)}
                          onKeyDown={e => e.key === 'Enter' && lookup()} />
                      </IonItem>
                    </IonList>
                    <IonButton expand="block" fill="outline" style={{ marginTop: 14 }} onClick={lookup}>
                      Look Up
                    </IonButton>

                    {lookupResult && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#818cf8' }}>
                          {lookupResult.client.client_id}
                        </div>
                        <div style={{ fontSize: 13, color: '#9898b8', margin: '6px 0 12px' }}>
                          👤 {lookupResult.client.first_name} · Family of {lookupResult.client.family_size}
                        </div>
                        <div className="eligibility-grid">
                          {CATS.map(cat => {
                            const e = lookupResult.eligibility[cat];
                            return (
                              <div className="elig-item" key={cat}>
                                <div className={`traffic-dot ${e?.eligible ? 'traffic-dot--green' : 'traffic-dot--red'}`} />
                                <div>
                                  <div className="elig-cat">{cat}</div>
                                  <div className="elig-status">
                                    {e?.eligible ? '✅ Eligible' : `🔴 ${e?.daysRemaining}d left`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3000} color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))} />
    </IonPage>
  );
};

export default Clients;
