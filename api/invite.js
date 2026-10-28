// Compatibility endpoint for browsers with a cached version of the old invite flow.
// Access is now open; no invite codes or activation records are read or written.
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  switch (req.body?.action) {
    case 'checkUser':
      return res.status(200).json({ success: true, activated: true });
    case 'validate':
      return res.status(200).json({ success: true, valid: true });
    case 'activate':
      return res.status(200).json({ success: true });
    default:
      return res.status(400).json({ success: false, error: 'Unknown action' });
  }
}
