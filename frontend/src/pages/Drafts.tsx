import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonRefresher, IonRefresherContent, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonButton, IonToast, IonBadge,
} from '@ionic/react';
import { apiGet, apiPost, apiPatch, type Draft } from '../hooks/useApi';

type DraftsResp = { drafts: Draft[] };

const Drafts: React.FC = () => {
  const [drafts, setDrafts]       = useState<Draft[]>([]);
  const [itemId, setItemId]       = useState('');
  const [draftType, setDraftType] = useState<'social' | 'email'>('social');
  const [toast, setToast]         = useState({ show: false, msg: '', color: 'success' });

  const showToast = (msg: string, color = 'success') => setToast({ show: true, msg, color });

  const load = useCallback(async () => {
    const data = await apiGet<DraftsResp>('/drafts?status=pending');
    setDrafts(data.drafts ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    const id = parseInt(itemId);
    if (!id) { showToast('Enter a valid item ID.', 'danger'); return; }
    try {
      await apiPost('/drafts/generate', { itemId: id, draftType });
      showToast('Draft generated!');
      setItemId('');
      load();
    } catch (e) { showToast(String(e), 'danger'); }
  };

  const update = async (id: number, status: 'approved' | 'dismissed') => {
    try {
      await apiPatch(`/drafts/${id}`, { status });
      showToast(`Draft ${status}`);
      load();
    } catch (e) { showToast(String(e), 'danger'); }
  };

  const timeStr = (ts: string) => new Date(ts).toLocaleString();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Draft Hub</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={e => { load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="content-wrap">
          <p className="page-title">Draft Review Hub</p>
          <p className="page-sub">AI-generated outreach drafts awaiting your review</p>

          {/* ── Generate ──────────────────────────────── */}
          <IonCard style={{ marginBottom: 20 }}>
            <IonCardContent>
              <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 12, fontSize: 14 }}>
                Generate Draft
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <IonList lines="none" style={{ flex: 1, minWidth: 140 }}>
                  <IonItem>
                    <IonLabel position="stacked">Item ID</IonLabel>
                    <IonInput type="number" value={itemId} placeholder="1"
                      onIonInput={e => setItemId(e.detail.value!)} />
                  </IonItem>
                </IonList>
                <IonList lines="none" style={{ minWidth: 130 }}>
                  <IonItem>
                    <IonLabel position="stacked">Type</IonLabel>
                    <IonSelect value={draftType} onIonChange={e => setDraftType(e.detail.value)}>
                      <IonSelectOption value="social">Social Post</IonSelectOption>
                      <IonSelectOption value="email">Email</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                </IonList>
                <IonButton color="primary" onClick={generate} style={{ marginBottom: 2 }}>
                  Generate
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* ── Pending Drafts ────────────────────────── */}
          {drafts.length === 0 ? (
            <IonCard>
              <IonCardContent style={{ textAlign: 'center', color: '#5a5a7a', padding: '28px' }}>
                📝 No pending drafts. Generate one above or wait for the hourly low-stock sweep.
              </IonCardContent>
            </IonCard>
          ) : (
            drafts.map(d => (
              <IonCard key={d.id} style={{ marginBottom: 14 }}>
                <IonCardContent>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <IonBadge color="secondary" style={{ fontSize: 10 }}>{d.draft_type}</IonBadge>
                    {d.subject && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0fa' }}>{d.subject}</span>
                    )}
                    <span style={{ fontSize: 11, color: '#5a5a7a', marginLeft: 'auto' }}>{timeStr(d.created_at)}</span>
                  </div>

                  {/* Body */}
                  <div className="draft-body-text">{d.body}</div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <IonButton fill="outline" color="success" size="small" onClick={() => update(d.id, 'approved')}>
                      ✅ Approve
                    </IonButton>
                    <IonButton fill="outline" color="danger" size="small" onClick={() => update(d.id, 'dismissed')}>
                      ✕ Dismiss
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))
          )}
        </div>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3000} color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))} />
    </IonPage>
  );
};

export default Drafts;
