export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*.capzeniths.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase non configuré' });

  try {
    const { table, action, data, agent } = req.body;
    const TABLES_ALLOWED = ['clients','diagnostics','seances','prospects','contenus','formations','veilles','onboardings','evenements'];
    if (!table || !action || !data) return res.status(400).json({ error: 'Paramètres manquants' });
    if (!TABLES_ALLOWED.includes(table)) return res.status(400).json({ error: 'Table non autorisée' });

    let url, method, body;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation',
    };

    switch (action) {
      case 'insert':
        url = `${supabaseUrl}/rest/v1/${table}`;
        method = 'POST';
        body = JSON.stringify(Array.isArray(data) ? data : [data]);
        break;
      case 'update':
        if (!data.id) return res.status(400).json({ error: 'id requis' });
        url = `${supabaseUrl}/rest/v1/${table}?id=eq.${data.id}`;
        method = 'PATCH';
        const { id: _id, ...updateData } = data;
        body = JSON.stringify(updateData);
        break;
      case 'select':
        const params = new URLSearchParams(data);
        url = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
        method = 'GET';
        break;
      default:
        return res.status(400).json({ error: 'Action non supportée' });
    }

    const response = await fetch(url, { method, headers, ...(body ? { body } : {}) });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.message || 'Erreur Supabase' });

    if (action !== 'select' && agent) {
      await fetch(`${supabaseUrl}/rest/v1/evenements`, {
        method: 'POST', headers,
        body: JSON.stringify([{ agent, type_event: action, description: `${action} sur ${table}`, reference_type: table, metadata: { table } }]),
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
