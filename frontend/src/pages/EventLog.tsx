import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonRefresher, IonRefresherContent, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonNote, IonButton, IonToast,
  IonAlert, IonBadge,
} from '@ionic/react';
import type { TxLog } from '../hooks/useApi';
import { apiPatch } from '../hooks/useApi';

type LogResp = { logs: TxLog[] };

const MCLBadge: React.FC<{ state: string }> = ({ state }) => {
  if (state === 'COMMITTED')       return <span className="mcl-committed">✅ COMMITTED</span>;
  if (state === 'HOLD_FOR_REVIEW') return <span className="mcl-hold">⚠️ HOLD</span>;
  return <span className="mcl-pending">⏳ PENDING</span>;
};

const EventLog: React.FC = () => {
  const [logs, setLogs]               = useState<TxLog[]>([]);
  const [toast, setToast]             = useState({ show: false, msg: '', color: 'success' });
  const [confirmAlert, setConfirmAlert] = useState<{
    show: boolean;
    txId: string;
    action: 'FORCE_APPROVE' | 'FORCE_REJECT';
  }>({ show: false, txId: '', action: 'FORCE_APPROVE' });

  const showToast = (msg: string, color = 'success') => setToast({ show: true, msg, color });

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/v1/event-log');
      const data = await res.json() as LogResp;
      setLogs(data.logs ?? []);
    } catch (e) {
      showToast(String(e), 'danger');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reconcile = async (txId: string, action: 'FORCE_APPROVE' | 'FORCE_REJECT') => {
    try {
      await apiPatch(`/transactions/${txId}/reconcile`, {
        adminAction:   action,
        operatorName:  'Dashboard Operator',
        correctionNote: action === 'FORCE_APPROVE'
          ? 'Admin forced approval via Event Log review.'
          : 'Admin rejected — data integrity issue.',
      });
      showToast(
        action === 'FORCE_APPROVE'
          ? `✅ TX #${txId} approved and committed to stock.`
          : `✖ TX #${txId} rejected.`,
        action === 'FORCE_APPROVE' ? 'success' : 'warning',
      );
      load();
    } catch (e) { showToast(String(e), 'danger'); }
  };

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
          <p className="page-sub">MCL pipeline status — approve or reject held transactions</p>

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
                <IonItem key={l.id} style={{ alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
                  <IonLabel>
                    {/* TX ID + timestamp */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#818cf8', fontWeight: 600 }}>
                        {l.transaction_id}
                      </span>
                      <IonNote style={{ fontSize: 11 }}>{timeStr(l.created_at)}</IonNote>
                    </div>

                    {/* Metadata row */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
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

                    {/* Force Approve / Reject — only for HOLD_FOR_REVIEW */}
                    {l.mcl_verification_state === 'HOLD_FOR_REVIEW' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <IonButton
                          size="small" fill="outline" color="success"
                          onClick={() => setConfirmAlert({ show: true, txId: l.transaction_id, action: 'FORCE_APPROVE' })}
                        >
                          ✅ Force Approve
                        </IonButton>
                        <IonButton
                          size="small" fill="outline" color="danger"
                          onClick={() => setConfirmAlert({ show: true, txId: l.transaction_id, action: 'FORCE_REJECT' })}
                        >
                          ✖ Force Reject
                        </IonButton>
                      </div>
                    )}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCard>
        </div>
      </IonContent>

      {/* Confirmation alert */}
      <IonAlert
        isOpen={confirmAlert.show}
        header={confirmAlert.action === 'FORCE_APPROVE' ? 'Force Approve?' : 'Force Reject?'}
        message={
          confirmAlert.action === 'FORCE_APPROVE'
            ? `Manually commit TX #${confirmAlert.txId} to stock. This bypasses MCL — use only when you have physically verified the intake.`
            : `Permanently reject TX #${confirmAlert.txId}. It will remain in the log with a rejection note.`
        }
        buttons={[
          { text: 'Cancel', role: 'cancel', handler: () => setConfirmAlert(a => ({ ...a, show: false })) },
          {
            text: confirmAlert.action === 'FORCE_APPROVE' ? 'Approve' : 'Reject',
            role: 'confirm',
            handler: () => {
              const { txId, action } = confirmAlert;
              setConfirmAlert(a => ({ ...a, show: false }));
              reconcile(txId, action);
            },
          },
        ]}
        onDidDismiss={() => setConfirmAlert(a => ({ ...a, show: false }))}
      />

      <IonToast isOpen={toast.show} message={toast.msg} duration={4000} color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))} />
    </IonPage>
  );
};

export default EventLog;
