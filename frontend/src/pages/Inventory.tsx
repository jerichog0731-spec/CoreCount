import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonRefresher, IonRefresherContent, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon,
  IonModal, IonInput, IonSelect, IonSelectOption, IonToast, IonFab, IonFabButton,
} from '@ionic/react';
import { addOutline, removeOutline, addCircleOutline } from 'ionicons/icons';
import { apiGet, apiPost, apiPatch, type Supply } from '../hooks/useApi';

type SuppliesResp = { supplies: Supply[] };

const catClass: Record<string, string> = {
  Hygiene: 'badge-hygiene', Laundry: 'badge-laundry',
  Cleaning: 'badge-cleaning', Special: 'badge-special',
};

const Inventory: React.FC = () => {
  const [supplies, setSupplies]   = useState<Supply[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState({ show: false, msg: '', color: 'success' });
  const [form, setForm]           = useState({
    itemName: '', itemBrand: '', materialCategory: '',
    unitConversionFactor: '', unitFairMarketValue: '', minThreshold: '5',
  });

  const showToast = (msg: string, color = 'success') => setToast({ show: true, msg, color });

  const load = useCallback(async () => {
    const data = await apiGet<SuppliesResp>('/supplies');
    setSupplies(data.supplies ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const adjust = async (id: number, adj: number) => {
    try {
      await apiPatch(`/supplies/${id}`, { adjustment: adj, reason: 'Manual adjustment' });
      showToast(`Stock adjusted ${adj > 0 ? '+' : ''}${adj}`);
      load();
    } catch (e) { showToast(String(e), 'danger'); }
  };

  const addItem = async () => {
    if (!form.itemName || !form.materialCategory) {
      showToast('Item name and category are required.', 'danger'); return;
    }
    try {
      await apiPost('/supplies', {
        itemName: form.itemName,
        itemBrand: form.itemBrand || undefined,
        materialCategory: form.materialCategory,
        unitConversionFactor: parseFloat(form.unitConversionFactor) || 0,
        unitFairMarketValue: parseFloat(form.unitFairMarketValue) || 0,
        minThreshold: parseInt(form.minThreshold) || 5,
      });
      showToast('Supply item added!');
      setShowModal(false);
      setForm({ itemName: '', itemBrand: '', materialCategory: '', unitConversionFactor: '', unitFairMarketValue: '', minThreshold: '5' });
      load();
    } catch (e) { showToast(String(e), 'danger'); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Inventory</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon slot="icon-only" icon={addCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="content-wrap">
          <p className="page-title">Inventory</p>
          <p className="page-sub">Supply stock levels — tap + to add a new item</p>

          <IonCard>
            <IonList lines="inset">
              {supplies.length === 0 && (
                <IonItem>
                  <IonLabel style={{ color: '#5a5a7a', textAlign: 'center', padding: '16px 0' }}>
                    No supply items yet. Tap + to add one.
                  </IonLabel>
                </IonItem>
              )}
              {supplies.map(s => (
                <IonItem key={s.item_id}>
                  <IonLabel>
                    <h2 style={{ fontWeight: 600, color: '#f0f0fa' }}>{s.item_name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span className={`badge-cat ${catClass[s.material_category]}`}>{s.material_category}</span>
                      {s.item_brand && <IonNote style={{ fontSize: 11 }}>{s.item_brand}</IonNote>}
                    </div>
                  </IonLabel>

                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={s.lowStock ? 'badge-low' : 'badge-ok'}>
                      {s.current_stock_on_hand} / {s.min_threshold}
                    </span>
                    <IonButton
                      fill="clear" size="small" color="success"
                      onClick={() => adjust(s.item_id, 1)}
                    >
                      <IonIcon slot="icon-only" icon={addOutline} />
                    </IonButton>
                    <IonButton
                      fill="clear" size="small" color="danger"
                      onClick={() => adjust(s.item_id, -1)}
                    >
                      <IonIcon slot="icon-only" icon={removeOutline} />
                    </IonButton>
                  </div>
                </IonItem>
              ))}
            </IonList>
          </IonCard>
        </div>

        {/* ── Add Item Modal ─────────────────────────── */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowModal(false)}>Cancel</IonButton>
              </IonButtons>
              <IonTitle>Add Supply Item</IonTitle>
              <IonButtons slot="end">
                <IonButton strong onClick={addItem}>Save</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Item Name *</IonLabel>
                <IonInput value={form.itemName} placeholder="e.g. Dove Shampoo"
                  onIonInput={e => setForm(f => ({ ...f, itemName: e.detail.value! }))} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Brand</IonLabel>
                <IonInput value={form.itemBrand} placeholder="e.g. Dove"
                  onIonInput={e => setForm(f => ({ ...f, itemBrand: e.detail.value! }))} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Category *</IonLabel>
                <IonSelect value={form.materialCategory} placeholder="Select..."
                  onIonChange={e => setForm(f => ({ ...f, materialCategory: e.detail.value }))}>
                  {['Hygiene', 'Laundry', 'Cleaning', 'Special'].map(c =>
                    <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
                  )}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Unit Size (oz)</IonLabel>
                <IonInput type="number" value={form.unitConversionFactor} placeholder="12"
                  onIonInput={e => setForm(f => ({ ...f, unitConversionFactor: e.detail.value! }))} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Fair Market Value / unit ($)</IonLabel>
                <IonInput type="number" value={form.unitFairMarketValue} placeholder="0.96"
                  onIonInput={e => setForm(f => ({ ...f, unitFairMarketValue: e.detail.value! }))} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Low-Stock Threshold</IonLabel>
                <IonInput type="number" value={form.minThreshold} placeholder="5"
                  onIonInput={e => setForm(f => ({ ...f, minThreshold: e.detail.value! }))} />
              </IonItem>
            </IonList>
          </IonContent>
        </IonModal>
      </IonContent>

      <IonToast isOpen={toast.show} message={toast.msg} duration={3000} color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))} />
    </IonPage>
  );
};

export default Inventory;
