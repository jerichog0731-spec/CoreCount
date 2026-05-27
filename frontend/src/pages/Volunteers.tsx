import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonRefresher, IonRefresherContent, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonInput, IonButton, IonToast,
  IonCheckbox, IonBadge, IonNote,
} from '@ionic/react';
import { apiGet, apiPost, type Volunteer } from '../hooks/useApi';

type VolResp = { submissions: Volunteer[] };

const Volunteers: React.FC = () => {
  const [vols, setVols]           = useState<Volunteer[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [isMinor, setIsMinor]     = useState(false);
  const [toast, setToast]         = useState({ show: false, msg: '', color: 'success' });
  const [form, setForm]           = useState({
    volunteerName: '', emergencyContact: '', emergencyPhone: '',
    relationship: '', signatureCapture: '', parentSignature: '',
  });

  const showToast = (msg: string, color = 'success') => setToast({ show: true, msg, color });

  const load = useCallback(async () => {
    const data = await apiGet<VolResp>('/volunteers');
    setVols(data.submissions ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.volunteerName || !form.emergencyContact || !form.emergencyPhone ||
        !form.relationship || !form.signatureCapture) {
      showToast('All fields are required.', 'danger'); return;
    }
    if (isMinor && !form.parentSignature) {
      showToast('Parent signature required for minor volunteers.', 'danger'); return;
    }
    try {
      await apiPost('/volunteers', {
        volunteerName: form.volunteerName,
        emergencyContact: form.emergencyContact,
        emergencyPhone: form.emergencyPhone,
        relationship: form.relationship,
        signatureCapture: form.signatureCapture,
        isMinor,
        parentSignature: isMinor ? form.parentSignature : undefined,
      });
      showToast('Volunteer submission recorded!');
      setShowForm(false);
      setForm({ volunteerName: '', emergencyContact: '', emergencyPhone: '', relationship: '', signatureCapture: '', parentSignature: '' });
      setIsMinor(false);
      load();
    } catch (e) { showToast(String(e), 'danger'); }
  };

  const timeStr = (ts: string) => new Date(ts).toLocaleDateString();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Volunteers</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={e => { load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="content-wrap">
          <p className="page-title">Volunteers</p>
          <p className="page-sub">Onboarding submissions and emergency contacts</p>

          {/* ── Submission Form ──────────────────────── */}
          {showForm && (
            <IonCard style={{ marginBottom: 20 }}>
              <IonCardContent>
                <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 12, fontSize: 14 }}>
                  New Volunteer Submission
                </p>
                <IonList lines="inset">
                  {[
                    { label: 'Volunteer Name *', key: 'volunteerName', placeholder: 'Full name' },
                    { label: 'Emergency Contact Name *', key: 'emergencyContact', placeholder: 'Full name' },
                    { label: 'Emergency Phone *', key: 'emergencyPhone', placeholder: '(555) 000-0000', type: 'tel' as const },
                    { label: 'Relationship *', key: 'relationship', placeholder: 'e.g. Parent, Spouse' },
                  ].map(f => (
                    <IonItem key={f.key}>
                      <IonLabel position="stacked">{f.label}</IonLabel>
                      <IonInput
                        type={f.type ?? 'text'}
                        value={form[f.key as keyof typeof form]}
                        placeholder={f.placeholder}
                        onIonInput={e => setForm(prev => ({ ...prev, [f.key]: e.detail.value! }))}
                      />
                    </IonItem>
                  ))}
                  <IonItem>
                    <IonCheckbox
                      checked={isMinor}
                      onIonChange={e => setIsMinor(e.detail.checked)}
                    />
                    <IonLabel style={{ marginLeft: 10 }}>Volunteer is a minor (under 18)</IonLabel>
                  </IonItem>
                  {isMinor && (
                    <IonItem>
                      <IonLabel position="stacked">Parent/Guardian Signature *</IonLabel>
                      <IonInput value={form.parentSignature} placeholder="Type full name as digital signature"
                        onIonInput={e => setForm(f => ({ ...f, parentSignature: e.detail.value! }))} />
                    </IonItem>
                  )}
                  <IonItem>
                    <IonLabel position="stacked">Volunteer Signature *</IonLabel>
                    <IonInput value={form.signatureCapture} placeholder="Type full name as digital signature"
                      onIonInput={e => setForm(f => ({ ...f, signatureCapture: e.detail.value! }))} />
                  </IonItem>
                </IonList>
                <IonButton expand="block" color="primary" style={{ marginTop: 14 }} onClick={submit}>
                  Submit Volunteer Form
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}

          {/* ── Submission History ──────────────────── */}
          <IonCard>
            <IonList lines="inset">
              {vols.length === 0 && (
                <IonItem>
                  <IonLabel style={{ color: '#5a5a7a', padding: '16px 0', textAlign: 'center' }}>
                    No volunteer submissions yet.
                  </IonLabel>
                </IonItem>
              )}
              {vols.map(v => (
                <IonItem key={v.id}>
                  <IonLabel>
                    <h2 style={{ fontWeight: 600, color: '#f0f0fa' }}>
                      {v.volunteer_name}
                      {v.is_minor === 1 && (
                        <IonBadge color="warning" style={{ marginLeft: 8, fontSize: 10 }}>Minor</IonBadge>
                      )}
                    </h2>
                    <p style={{ fontSize: 12, color: '#9898b8' }}>
                      Emergency: {v.emergency_contact} ({v.relationship}) · {v.emergency_phone}
                    </p>
                  </IonLabel>
                  <IonNote slot="end" style={{ fontSize: 11 }}>{timeStr(v.submission_date)}</IonNote>
                </IonItem>
              ))}
            </IonList>
          </IonCard>
        </div>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3000} color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))} />
    </IonPage>
  );
};

export default Volunteers;
