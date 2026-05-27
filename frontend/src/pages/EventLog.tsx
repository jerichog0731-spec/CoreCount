import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonRefresher, IonRefresherContent, IonCard, IonList, IonItem,
  IonLabel, IonNote, IonButton, IonToast,
} from '@ionic/react';
import type { TxLog } from '../hooks/useApi';

type LogResp = { logs: TxLog[] };

const MCLBadge: React.FC<{ state: string }> = ({ state }) => {
  if (state === 'COMMITTED')       return <span className="mcl-committed">✅ COMMITTED</span>;
  if (state === 'HOLD_FOR_REVIEW') return <span className="mcl-hold">⚠️ HOLD</span>;
  return <span className="mcl-pending">⏳ PENDING</span>;
};

const EventLog: React.FC = () => {
  const [logs, setLogs]   = useState<TxLog[]>([]);
  const [toast, setToast] = useState({ show: false, msg: '' });

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/v1/event-log');
      const data = await res.json() as LogResp;
      setLogs(data.logs ?? []);
    } catch (e) {
      setToast({ show: true, msg: String(e) });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const timeStr = (ts: string) => new Date(ts).toLocaleString();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Event Log</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={load}>Refresh</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={e => { load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="content-wrap">
          <p className="page-title">Event Bus Log</p>
          <p className="page-sub">Real-time MCL validation and intake pipeline status (last 50)</p>

          <IonCard>
            <IonList lines="inset">
              {logs.length === 0 && (
                <IonItem>
                  <IonLabel style={{ color: '#5a5a7a', textAlign: 'center', padding: '20px 0' }}>
                    No transactions yet. Submit an intake to trigger the pipeline.
                  </IonLabel>
                </IonItem>
              )}
              {logs.map(l => (
                <IonItem key={l.id}>
                  <IonLabel>
                    <h2 style={{ fontFamily: 'monospace', fontSize: 12, color: '#818cf8', fontWeight: 600 }}>
                      {l.transaction_id}
                    </h2>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      {l.item_category && (
                        <span style={{ fontSize: 11, color: '#9898b8' }}>{l.item_category}</span>
                      )}
                      {l.bulk_oz_intake != null && (
                        <span style={{ fontSize: 11, color: '#9898b8' }}>{l.bulk_oz_intake} oz</span>
                      )}
                      {l.calculated_predicted_packs != null && (
                        <span style={{ fontSize: 11, color: '#9898b8' }}>{l.calculated_predicted_packs} packs</span>
                      )}
                      <MCLBadge state={l.mcl_verification_state} />
                    </div>
                  </IonLabel>
                  <IonNote slot="end" style={{ fontSize: 11 }}>{timeStr(l.created_at)}</IonNote>
                </IonItem>
              ))}
            </IonList>
          </IonCard>
        </div>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3000} color="danger"
        onDidDismiss={() => setToast({ show: false, msg: '' })} />
    </IonPage>
  );
};

export default EventLog;
