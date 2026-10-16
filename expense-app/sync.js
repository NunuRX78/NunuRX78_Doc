import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const emit = () => window.dispatchEvent(new CustomEvent("cloudstate"));
const configured = !String(firebaseConfig.apiKey).startsWith("YOUR_");
const cloud = { configured, user: null };
window.cloud = cloud;

if (!configured) {
  emit();
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  let unsub = null;
  const col = () => collection(db, "users", cloud.user.uid, "tx");
  const ref = id => doc(db, "users", cloud.user.uid, "tx", String(id));
  const clean = r => ({ id: r.id, type: r.type, amount: r.amount, cat: r.cat, note: r.note || "", date: r.date });

  cloud.login = (e, p) => signInWithEmailAndPassword(auth, e, p);
  cloud.register = (e, p) => createUserWithEmailAndPassword(auth, e, p);
  cloud.logout = () => signOut(auth);
  cloud.set = r => setDoc(ref(r.id), clean(r)).catch(console.error);
  cloud.del = id => deleteDoc(ref(id)).catch(console.error);
  cloud.replaceAll = async arr => {
    try {
      const keep = new Set(arr.map(r => String(r.id)));
      const ops = [];
      (window.cloudLast || []).forEach(r => { if (!keep.has(String(r.id))) ops.push(["d", r]); });
      arr.forEach(r => ops.push(["s", r]));
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db);
        ops.slice(i, i + 400).forEach(([k, r]) => k === "d" ? b.delete(ref(r.id)) : b.set(ref(r.id), clean(r)));
        await b.commit();
      }
    } catch (e) { console.error(e); }
  };

  onAuthStateChanged(auth, user => {
    cloud.user = user;
    if (unsub) { unsub(); unsub = null; }
    window.cloudLast = [];
    if (user) {
      const flagKey = "fb-uploaded-" + user.uid;
      unsub = onSnapshot(col(), snap => {
        let arr = snap.docs.map(d => d.data());
        let uploaded = false;
        try { uploaded = localStorage.getItem(flagKey) === "1"; } catch (_) {}
        if (!uploaded) {
          // Chưa có dữ liệu từ máy chủ thì chưa ghi đè dữ liệu trên máy
          if (snap.metadata.fromCache) return;
          const ids = new Set(arr.map(r => String(r.id)));
          const extra = (window.getLocalData ? window.getLocalData() : []).filter(r => !ids.has(String(r.id)));
          extra.forEach(r => cloud.set(r));
          arr = arr.concat(extra);
          try { localStorage.setItem(flagKey, "1"); } catch (_) {}
        }
        window.cloudLast = arr;
        if (window.onCloudData) window.onCloudData(arr);
      }, err => console.error(err));
    }
    emit();
  });
  emit();
}
