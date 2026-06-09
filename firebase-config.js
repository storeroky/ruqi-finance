// ======================================================
// ضع هنا إعدادات Firebase الخاصة بك
// من: Firebase Console → Project Settings → Your apps → Web
// ======================================================
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ======================================================
// طبقة البيانات المشتركة — تعمل أون/أوف لاين
// ======================================================
class RuqiDB {
  constructor() {
    this.local = window.localStorage;
    this.firebaseReady = false;
    this.db = null;
    this._initFirebase();
  }

  _initFirebase() {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      this.db = firebase.database();
      this.firebaseReady = true;
      console.log('✅ Firebase متصل');
    } catch (e) {
      console.warn('⚠️ Firebase غير متاح — وضع أوف لاين');
    }
  }

  // ---- قراءة ----
  async getOrders() {
    if (this.firebaseReady) {
      const snap = await this.db.ref('orders').once('value');
      return snap.val() ? Object.values(snap.val()) : [];
    }
    return JSON.parse(this.local.getItem('ruqi_orders') || '[]');
  }

  async getExpenses() {
    if (this.firebaseReady) {
      const snap = await this.db.ref('expenses').once('value');
      return snap.val() ? Object.values(snap.val()) : [];
    }
    return JSON.parse(this.local.getItem('ruqi_expenses') || '[]');
  }

  // ---- كتابة ----
  async saveOrder(order) {
    const orders = await this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) orders[idx] = order; else orders.push(order);
    this.local.setItem('ruqi_orders', JSON.stringify(orders));
    if (this.firebaseReady) {
      await this.db.ref(`orders/${order.id}`).set(order);
    }
    return order;
  }

  async saveExpense(expense) {
    const exps = await this.getExpenses();
    const idx = exps.findIndex(e => e.id === expense.id);
    if (idx >= 0) exps[idx] = expense; else exps.push(expense);
    this.local.setItem('ruqi_expenses', JSON.stringify(exps));
    if (this.firebaseReady) {
      await this.db.ref(`expenses/${expense.id}`).set(expense);
    }
    return expense;
  }

  async deleteOrder(id) {
    let orders = await this.getOrders();
    orders = orders.filter(o => o.id !== id);
    this.local.setItem('ruqi_orders', JSON.stringify(orders));
    if (this.firebaseReady) await this.db.ref(`orders/${id}`).remove();
  }

  async deleteExpense(id) {
    let exps = await this.getExpenses();
    exps = exps.filter(e => e.id !== id);
    this.local.setItem('ruqi_expenses', JSON.stringify(exps));
    if (this.firebaseReady) await this.db.ref(`expenses/${id}`).remove();
  }

  // ---- مستمعات التحديث الفوري ----
  onOrdersChange(cb) {
    if (this.firebaseReady) {
      this.db.ref('orders').on('value', snap => {
        const data = snap.val() ? Object.values(snap.val()) : [];
        this.local.setItem('ruqi_orders', JSON.stringify(data));
        cb(data);
      });
    }
  }

  onExpensesChange(cb) {
    if (this.firebaseReady) {
      this.db.ref('expenses').on('value', snap => {
        const data = snap.val() ? Object.values(snap.val()) : [];
        this.local.setItem('ruqi_expenses', JSON.stringify(data));
        cb(data);
      });
    }
  }

  // ---- مساعدات ----
  newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  nextOrderNum() {
    const n = parseInt(this.local.getItem('ruqi_counter') || '0') + 1;
    this.local.setItem('ruqi_counter', n);
    if (this.firebaseReady) this.db.ref('meta/counter').set(n);
    return n;
  }
}
