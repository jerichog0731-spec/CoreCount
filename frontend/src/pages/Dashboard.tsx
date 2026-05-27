import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonRefresher, IonRefresherContent, IonCard, IonCardContent,
  IonGrid, IonRow, IonCol, IonIcon, IonToast,
} from '@ionic/react';
import {
  cubeOutline, alertCircleOutline, peopleOutline, documentTextOutline,
} from 'ionicons/icons';
import { apiGet, type Supply, type Draft } from '../hooks/useApi';

type SuppliesResp = { supplies: Supply[] };
type DraftsResp   = { drafts: Draft[]; total: number };

const CATS = ['Hygiene', 'Laundry', 'Cleaning', 'Special'] as const;

const Dashboard: React.FC = () => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const [toast, setToast]   = useState({ show: false, msg: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [supData, draftData] = await Promise.all([
        apiGet<SuppliesResp>('/supplies'),
        apiGet<DraftsResp>('/drafts?status=pending'),
      ]);
      setSupplies(supData.supplies ?? []);
      setPendingDrafts(draftData.total ?? 0);
    } catch (e) {
      setToast({ show: true, msg: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowStock = supplies.filter(s => s.lowStock);
  const totalUnits = supplies.reduce((a, s) => a + s.current_stock_on_hand, 0);

  const byCat = CATS.map(cat => ({
    cat,
    items: supplies.filter(s => s.material_category === cat),
    total: supplies.filter(s => s.material_category === cat)
                   .reduce((a, s) => a + s.current_stock_on_hand, 0),
  }));

  const catClass: Record<string, string> = {
    Hygiene: 'badge-hygiene', Laundry: 'badge-laundry',
    Cleaning: 'badge-cleaning', Special: 'badge-special',
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="content-wrap">
          <p className="page-title">Dashboard</p>
          <p className="page-sub">Live inventory overview and system status</p>

          {/* ── Stat Cards ──────────────────────────────── */}
          <IonGrid className="ion-no-padding" style={{ marginBottom: 20 }}>
            <IonRow>
              {[
                { label: 'Total Items', value: loading ? '…' : String(supplies.length), icon: cubeOutline, cls: 'stat-icon--purple' },
                { label: 'Low Stock Alerts', value: loading ? '…' : String(lowStock.length), icon: alertCircleOutline, cls: 'stat-icon--red' },
                { label: 'Total Units On Hand', value: loading ? '…' : String(totalUnits), icon: peopleOutline, cls: 'stat-icon--blue' },
                { label: 'Pending Drafts', value: loading ? '…' : String(pendingDrafts), icon: documentTextOutline, cls: 'stat-icon--green' },
              ].map(s => (
                <IonCol size="6" sizeLg="3" key={s.label} style={{ paddingRight: 8, paddingBottom: 8 }}>
                  <IonCard className="stat-card" style={{ margin: 0 }}>
                    <IonCardContent>
                      <div className={`stat-icon ${s.cls}`}>
                        <IonIcon icon={s.icon} />
                      </div>
                      <div>
                        <span className="stat-label">{s.label}</span>
                        <span className="stat-value">{s.value}</span>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>

          <IonGrid className="ion-no-padding">
            <IonRow>
              {/* Inventory by category */}
              <IonCol size="12" sizeMd="6" style={{ paddingRight: 8 }}>
                <IonCard>
                  <IonCardContent>
                    <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 12, fontSize: 14 }}>
                      Inventory by Category
                    </p>
                    {byCat.map(({ cat, items, total }) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className={`badge-cat ${catClass[cat]}`}>{cat}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#f0f0fa', fontSize: 14 }}>{total} units</div>
                          <div style={{ fontSize: 11, color: '#5a5a7a' }}>{items.length} item type{items.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                    {supplies.length === 0 && !loading && (
                      <p style={{ color: '#5a5a7a', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                        No inventory items yet.
                      </p>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>

              {/* Low Stock Alerts */}
              <IonCol size="12" sizeMd="6">
                <IonCard>
                  <IonCardContent>
                    <p style={{ fontWeight: 600, color: '#f0f0fa', marginBottom: 12, fontSize: 14 }}>
                      Low Stock Alerts
                    </p>
                    {lowStock.length === 0 && !loading && (
                      <p style={{ color: '#5a5a7a', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                        ✅ All items above threshold.
                      </p>
                    )}
                    {lowStock.map(s => (
                      <div key={s.item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <div style={{ fontWeight: 500, color: '#f0f0fa', fontSize: 13 }}>{s.item_name}</div>
                          <div style={{ fontSize: 11, color: '#5a5a7a' }}>{s.item_brand ?? ''} · {s.material_category}</div>
                        </div>
                        <span className="badge-low">{s.current_stock_on_hand} left</span>
                      </div>
                    ))}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3000} color="danger"
        onDidDismiss={() => setToast({ show: false, msg: '' })} />
    </IonPage>
  );
};

export default Dashboard;
