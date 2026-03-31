// api/firebase.js — используем REST API Firebase, без SDK
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, data, id } = req.body;
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  
  if (!FIREBASE_API_KEY) {
    console.error('[Firebase API] Missing FIREBASE_API_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  const DB_URL = 'https://prototypeciva-default-rtdb.europe-west1.firebasedatabase.app';
  
  try {
    if (action === 'save') {
      // Создание новой записи — POST
      const url = `${DB_URL}/dating_profiles.json?auth=${FIREBASE_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, createdAt: Date.now() })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return res.status(200).json({ success: true, id: result.name });
      
    } else if (action === 'update') {
      // Обновление существующей записи — PATCH
      if (!id) {
        return res.status(400).json({ error: 'ID required for update' });
      }
      const url = `${DB_URL}/dating_profiles/${id}.json?auth=${FIREBASE_API_KEY}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, updatedAt: Date.now() })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return res.status(200).json({ success: true });
      
    } else if (action === 'getAll') {
      // Получение всех записей — GET
      const url = `${DB_URL}/dating_profiles.json?auth=${FIREBASE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const profiles = data ? Object.entries(data).map(([id, profile]) => ({ id, ...profile })) : [];
      return res.status(200).json({ success: true, profiles });
      
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[Firebase API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}