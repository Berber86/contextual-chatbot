// api/invite.js — проверка и активация инвайт-кодов
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const { action, code, odex } = req.body || {};
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  const DB_URL = 'https://prototypeciva-default-rtdb.europe-west1.firebasedatabase.app';
  
  if (!FIREBASE_API_KEY) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }
  
  function buildUrl(path) {
    return `${DB_URL}/${path}.json?auth=${FIREBASE_API_KEY}`;
  }
  
  async function firebaseGet(path) {
    const response = await fetch(buildUrl(path), { method: 'GET' });
    if (!response.ok) throw new Error(`GET failed: ${response.status}`);
    return response.json();
  }
  
  async function firebasePatch(path, payload) {
    const response = await fetch(buildUrl(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`PATCH failed: ${response.status}`);
    return response.json();
  }
  
  async function firebasePut(path, payload) {
    const response = await fetch(buildUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`PUT failed: ${response.status}`);
    return response.json();
  }
  
  try {
    // ==================== VALIDATE CODE ====================
    if (action === 'validate') {
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Code required' });
      }
      
      const cleanCode = code.trim().toUpperCase();
      const codeData = await firebaseGet(`invite_codes/${cleanCode}`);
      
      if (!codeData) {
        return res.status(200).json({ success: false, valid: false, reason: 'not_found' });
      }
      
      if (codeData.used) {
        return res.status(200).json({ success: false, valid: false, reason: 'already_used' });
      }
      
      return res.status(200).json({ success: true, valid: true });
    }
    
    // ==================== ACTIVATE CODE ====================
    if (action === 'activate') {
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Code required' });
      }
      
      if (!odex || typeof odex !== 'string') {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }
      
      const cleanCode = code.trim().toUpperCase();
      const codeData = await firebaseGet(`invite_codes/${cleanCode}`);
      
      if (!codeData) {
        return res.status(200).json({ success: false, error: 'Invalid code' });
      }
      
      if (codeData.used) {
        return res.status(200).json({ success: false, error: 'Code already used' });
      }
      
      // Активируем код
      await firebasePatch(`invite_codes/${cleanCode}`, {
        used: true,
        usedBy: odex,
        usedAt: Date.now()
      });
      
      // Добавляем юзера в список активированных
      await firebasePut(`activated_users/${odex}`, {
        code: cleanCode,
        activatedAt: Date.now()
      });
      
      return res.status(200).json({ success: true });
    }
    
    // ==================== CHECK USER ====================
    if (action === 'checkUser') {
      if (!odex || typeof odex !== 'string') {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }
      
      const userData = await firebaseGet(`activated_users/${odex}`);
      
      return res.status(200).json({
        success: true,
        activated: !!userData,
        activatedAt: userData?.activatedAt || null
      });
    }
    
    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    
  } catch (error) {
    console.error('[Invite API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}