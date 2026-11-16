const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAC2C7BKk9ad97SJfZ9WTSkt90EQ2j8m8A",
  authDomain: "ruqi-finance.firebaseapp.com",
  databaseURL: "https://ruqi-finance-default-rtdb.firebaseio.com",
  projectId: "ruqi-finance",
  storageBucket: "ruqi-finance.firebasestorage.app",
  messagingSenderId: "27450612516",
  appId: "1:27450612516:web:d4d9bf693f8cc8ce3fb1b1",
  measurementId: "G-EB85FZLXC9"
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
      this._patchRef();
      this.firebaseReady = true;
      console.log('✅ Firebase متصل — ruqi-finance');
    } catch (e) {
      console.warn('⚠️ Firebase غير متاح — وضع أوف لاين', e);
    }
  }

  // يمنع تعليق التطبيق عند انقطاع الإنترنت:
  //  - قراءة مجموعة كاملة (orders/expenses/...) تنتظر 5 ثوانٍ ثم تعود للنسخة المحلية
  //  - الكتابة تنتظر تأكيد الخادم 3 ثوانٍ فقط (SDK يحتفظ بالكتابة ويرسلها عند عودة الاتصال)
  //  - رفض الصلاحيات (Permission denied) يظهر كخطأ حقيقي ولا يُخفى
  _patchRef() {
    const realRef = this.db.ref.bind(this.db);
    const local = this.local;
    const wait = (ms, v) => new Promise(res => setTimeout(() => res(v), ms));
    this.db.ref = (path) => {
      const r = realRef(path);
      if (typeof path !== 'string') return r;
      const once = r.once.bind(r), set = r.set.bind(r), remove = r.remove.bind(r);
      const isColl = path.indexOf('/') < 0;
      r.once = (ev, ...a) => {
        if (ev !== 'value' || !isColl) return once(ev, ...a);
        return Promise.race([once(ev, ...a), wait(5000, null).then(() => {
          let v = null;
          try { v = JSON.parse(local.getItem('ruqi_' + path) || 'null'); } catch (e) {}
          if (Array.isArray(v) && !v.length) v = null;
          return { val: () => v, exists: () => v != null };
        })]);
      };
      r.set = (v) => Promise.race([set(v), wait(3000)]);
      r.remove = () => Promise.race([remove(), wait(3000)]);
      return r;
    };
  }

  _loc(n) { try { return JSON.parse(this.local.getItem('ruqi_' + n) || '[]'); } catch (e) { return []; } }

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

  async saveOrder(order) {
    const orders = this._loc('orders');
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) orders[idx] = order; else orders.push(order);
    this.local.setItem('ruqi_orders', JSON.stringify(orders));
    if (this.firebaseReady) {
      await this.db.ref(`orders/${order.id}`).set(order);
    }
    return order;
  }

  async saveExpense(expense) {
    const exps = this._loc('expenses');
    const idx = exps.findIndex(e => e.id === expense.id);
    if (idx >= 0) exps[idx] = expense; else exps.push(expense);
    this.local.setItem('ruqi_expenses', JSON.stringify(exps));
    if (this.firebaseReady) {
      await this.db.ref(`expenses/${expense.id}`).set(expense);
    }
    return expense;
  }

  async deleteOrder(id) {
    let orders = this._loc('orders');
    orders = orders.filter(o => o.id !== id);
    this.local.setItem('ruqi_orders', JSON.stringify(orders));
    if (this.firebaseReady) await this.db.ref(`orders/${id}`).remove();
  }

  async deleteExpense(id) {
    let exps = this._loc('expenses');
    exps = exps.filter(e => e.id !== id);
    this.local.setItem('ruqi_expenses', JSON.stringify(exps));
    if (this.firebaseReady) await this.db.ref(`expenses/${id}`).remove();
  }

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

  newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // عدّاد مشترك بين الجوال واللابتوب (معاملة ذرّية على Firebase) لمنع تكرار أرقام الطلبيات/العقود
  async nextCounter(name) {
    const isOrder = name === 'order';
    const lk = isOrder ? 'ruqi_counter' : 'ruqi_' + name + '_counter';
    let floor = parseInt(this.local.getItem(lk) || '0') || 0;
    try {
      const arr = JSON.parse(this.local.getItem(isOrder ? 'ruqi_orders' : 'ruqi_contracts') || '[]');
      arr.forEach(x => { const n = parseInt(isOrder ? x.orderNum : x.contractNum, 10); if (n > floor) floor = n; });
    } catch (e) {}
    let n = floor + 1;
    if (this.firebaseReady) {
      try {
        const ref = this.db.ref('meta/' + (isOrder ? 'counter' : name + 'Counter'));
        const res = await Promise.race([
          ref.transaction(cur => Math.max(parseInt(cur) || 0, floor) + 1),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
        ]);
        if (res && res.committed) n = res.snapshot.val();
      } catch (e) { console.warn('عدّاد محلي (أوف لاين)', e); }
    }
    this.local.setItem(lk, n);
    return n;
  }

  nextOrderNum() { return this.nextCounter('order'); }
}
