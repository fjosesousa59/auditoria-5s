import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

// ============================================================
// COLE AQUI a configuração do SEU projeto Firebase.
// Veja no README.md como conseguir esses valores (é gratuito).
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCVVfDC_Q7BHkYvQxLvmfmNAU0om6gKJVA",
  authDomain: "auditoria-5s-mg25.firebaseapp.com",
  databaseURL: "https://auditoria-5s-mg25-default-rtdb.firebaseio.com",
  projectId: "auditoria-5s-mg25",
  storageBucket: "auditoria-5s-mg25.firebasestorage.app",
  messagingSenderId: "702632122122",
  appId: "1:702632122122:web:794056f6253cefc6bd0cf3",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Helpers com a mesma "forma" do window.storage usado no protótipo,
// mas agora gravando de verdade num banco compartilhado por todos os usuários.
export const store = {
  async get(key) {
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : null;
  },
  async set(key, value) {
    await set(ref(db, key), value);
    return true;
  },
  async remove(key) {
    await remove(ref(db, key));
  },
};
