import React, { useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonCard, IonCardContent, IonList, IonItem, IonLabel,
  IonInput, IonTextarea, IonButton, IonToast, IonBadge, IonSpinner,
} from '@ionic/react';
import { sparklesOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { apiPost } from '../hooks/useApi';

const AIIntake: React.FC = () => {
  const [operator, setOperator] = useState('');
  const [rawText, setRawText]   = useState('');
  const [result, setResult]     = useState<unknown>(null);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState({ show: false, msg: '', color: 'success' });

  const showToast = (msg: string, color = 'success') => setToast({ show: true, msg, color });

  const submit = async () => {
    if (!rawText.trim()) { showToast('Please enter a raw intake description.', 'danger'); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost('/intake/parse', {
        rawText: rawText.trim(),
        operatorName: operator.trim() || 'Dashboard User',
      });
      setResult(data);
      setRawText('');
      showToast('Intake submitted to Event Bus ✅');
    } catch (e) {
      setResult({ error: String(e) });
      showToast(String(e), 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>AI Intake</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="content-wrap">
          <p className="page-title">AI Intake Parser</p>
          <p className="page-sub">
            Submit a raw donation description — the AI parses it and routes it through the MCL pipeline
          </p>

          <IonCard>
            <IonCardContent>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <IonIcon icon={sparklesOutline} style={{ color: '#a78bfa', fontSize: 20 }} />
                <span style={{ fontWeight: 600, color: '#f0f0fa', fontSize: 14 }}>Submit Intake</span>
                <IonBadge color="secondary" style={{ marginLeft: 'auto', fontSize: 10 }}>
                  AI: Placeholder Active
                </IonBadge>
              </div>

              <IonList lines="inset">
                <IonItem>
                  <IonLabel position="stacked">Operator Name</IonLabel>
                  <IonInput value={operator} placeholder="Your name"
                    onIonInput={e => setOperator(e.detail.value!)} />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Raw Intake Description *</IonLabel>
                  <IonTextarea
                    value={rawText}
                    rows={5}
                    placeholder="e.g. Received 2 gallons of Suave shampoo donated by Grace Church. Also 48oz Dawn dish soap."
                    onIonInput={e => setRawText(e.detail.value!)}
                  />
                </IonItem>
              </IonList>

              <IonButton
                expand="block"
                color="primary"
                style={{ marginTop: 16 }}
                onClick={submit}
                disabled={loading}
              >
                {loading ? <IonSpinner name="crescent" /> : 'Parse & Submit to Event Bus →'}
              </IonButton>
            </IonCardContent>
          </IonCard>

          {result !== null && (
            <IonCard>
              <IonCardContent>
                <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 10, fontSize: 14 }}>
                  Parse Result
                </p>
                <pre className="code-block">{JSON.stringify(result, null, 2)}</pre>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3500} color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))} />
    </IonPage>
  );
};

export default AIIntake;
