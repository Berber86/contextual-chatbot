import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, get, child, update } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "prototypeciva.firebaseapp.com",
  databaseURL: "https://prototypeciva-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "prototypeciva",
  storageBucket: "prototypeciva.firebasestorage.app",
  appId: "1:191956270979:web:dc850a748171a8304080b6"
};

// Проверяем, есть ли ключ
if (!process.env.FIREBASE_API_KEY) {
  console.error('[Firebase API] ERROR: FIREBASE_API_KEY not set in environment!');
}

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default async function handler(req, res) {
  // Логируем запрос
  console.log('[Firebase API] Request:', {
    method: req.method,
    action: req.body?.action,
    hasId: !!req.body?.id
  });
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, data, id } = req.body;
  
  try {
    if (action === 'save') {
      // Создание новой анкеты
      const profilesRef = ref(db, 'dating_profiles');
      const newProfileRef = push(profilesRef);
      await set(newProfileRef, {
        ...data,
        createdAt: Date.now()
      });
      console.log('[Firebase API] Saved new profile:', newProfileRef.key);
      return res.status(200).json({ success: true, id: newProfileRef.key });
      
    } else if (action === 'update') {
      // Обновление существующей анкеты
      if (!id) {
        return res.status(400).json({ error: 'ID required for update' });
      }
      const profileRef = ref(db, `dating_profiles/${id}`);
      await update(profileRef, {
        ...data,
        updatedAt: Date.now()
      });
      console.log('[Firebase API] Updated profile:', id);
      return res.status(200).json({ success: true });
      
    } else if (action === 'getAll') {
      const snapshot = await get(child(ref(db), 'dating_profiles'));
      if (snapshot.exists()) {
        const profiles = snapshot.val();
        const profilesArray = Object.entries(profiles).map(([id, profile]) => ({ id, ...profile }));
        return res.status(200).json({ success: true, profiles: profilesArray });
      }
      return res.status(200).json({ success: true, profiles: [] });
      
    } else {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error('[Firebase API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}