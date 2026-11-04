// api/firebase.js — REST API для Firebase Realtime Database
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const { action, data, id } = req.body || {};
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  const DB_URL = 'https://prototypeciva-default-rtdb.europe-west1.firebasedatabase.app';
  
  if (!FIREBASE_API_KEY) {
    console.error('[Firebase API] Missing FIREBASE_API_KEY');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }
  
  function buildUrl(path) {
    return `${DB_URL}/${path}.json?auth=${FIREBASE_API_KEY}`;
  }
  
  async function firebaseGet(path) {
    const response = await fetch(buildUrl(path), { method: 'GET' });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET ${path} failed: HTTP ${response.status} ${text}`);
    }
    return response.json();
  }
  
  async function firebasePost(path, payload) {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`POST ${path} failed: HTTP ${response.status} ${text}`);
    }
    
    return response.json();
  }
  
  async function firebasePatch(path, payload) {
    const response = await fetch(buildUrl(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PATCH ${path} failed: HTTP ${response.status} ${text}`);
    }
    
    return response.json();
  }
  
  try {
    // ==================== DATING PROFILES ====================
    
    if (action === 'save') {
      const result = await firebasePost('dating_profiles', {
        ...data,
        createdAt: Date.now()
      });
      
      return res.status(200).json({
        success: true,
        id: result.name
      });
    }
    
    if (action === 'update') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID required for update' });
      }
      
      await firebasePatch(`dating_profiles/${id}`, {
        ...data,
        updatedAt: Date.now()
      });
      
      return res.status(200).json({ success: true });
    }
    
    if (action === 'getAll') {
      const raw = await firebaseGet('dating_profiles');
      const profiles = raw ?
        Object.entries(raw).map(([profileId, profile]) => ({ id: profileId, ...profile })) :
        [];
      
      return res.status(200).json({ success: true, profiles });
    }
    
    if (action === 'getProfile') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID required for getProfile' });
      }
      
      const profile = await firebaseGet(`dating_profiles/${id}`);
      
      return res.status(200).json({
        success: true,
        profile: profile || null
      });
    }
    
    // ==================== MESSAGES ====================
    
    if (action === 'sendMessage') {
      const senderId = id;
      const recipientId = data?.to;
      const text = (data?.text || '').trim();
      const timestamp = Number(data?.timestamp) || Date.now();
      
      if (!senderId) {
        return res.status(400).json({ success: false, error: 'Sender ID required' });
      }
      
      if (!recipientId) {
        return res.status(400).json({ success: false, error: 'Recipient ID required' });
      }
      
      if (!text) {
        return res.status(400).json({ success: false, error: 'Message text is empty' });
      }
      
      if (text.length > 512) {
        return res.status(400).json({ success: false, error: 'Message exceeds 512 characters' });
      }
      
      const result = await firebasePost(`messages/${recipientId}`, {
        from: senderId,
        text,
        timestamp,
        createdAt: Date.now()
      });
      
      return res.status(200).json({
        success: true,
        id: result.name
      });
    }
    
    if (action === 'getMessages') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'Recipient ID required for getMessages' });
      }
      
      const raw = await firebaseGet(`messages/${id}`);
      const messages = raw ?
        Object.entries(raw).map(([messageId, message]) => ({
          id: messageId,
          ...message
        })) :
        [];
      
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      return res.status(200).json({
        success: true,
        messages
      });
    }
    
    if (action === 'deleteMessages') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'Recipient ID required for deleteMessages' });
      }
      
      const messageIds = Array.isArray(data?.messageIds) ? data.messageIds : [];
      if (messageIds.length === 0) {
        return res.status(200).json({ success: true, deleted: 0 });
      }
      
      const patch = {};
      messageIds.forEach(msgId => {
        patch[msgId] = null;
      });
      
      await firebasePatch(`messages/${id}`, patch);
      
      return res.status(200).json({
        success: true,
        deleted: messageIds.length
      });
    }
    
    return res.status(400).json({
      success: false,
      error: `Unknown action: ${action}`
    });
  } catch (error) {
    console.error('[Firebase API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown server error'
    });
  }
}