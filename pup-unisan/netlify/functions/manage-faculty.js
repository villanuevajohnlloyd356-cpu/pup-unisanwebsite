// Creates/deletes faculty with their login account. Service key stays server-side.
const { SUPABASE_URL: URL_, SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SVC } = process.env;
const json = (s, o) => ({ statusCode: s, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
const svc = (path, opt = {}) => fetch(`${URL_}${path}`, { ...opt, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opt.headers || {}) } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  try {
  if (!URL_ || !ANON || !SVC) {
    return json(500, { error: 'Netlify environment variables are missing. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.' });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return json(401, { error: 'Not signed in' });
  const u = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
  if (!u.ok) return json(401, { error: 'Invalid session' });
  const { id: callerId } = await u.json();
  const p = await (await svc(`/rest/v1/profiles?id=eq.${callerId}&select=role`)).json();
  if (!p[0] || p[0].role !== 'admin') return json(403, { error: 'Administrator access required' });

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad request' }); }

  if (b.action === 'create') {
    const { full_name, faculty_id, email, department, position, photo_url, password } = b;
    if (![full_name, faculty_id, email, department, position].every(v => v && String(v).trim())) return json(400, { error: 'All fields except photo are required' });
    if (!EMAIL.test(email)) return json(400, { error: 'Enter a valid email address' });
    if (!password || password.length < 8) return json(400, { error: 'Temporary password must be at least 8 characters' });
    const dup = await (await svc(`/rest/v1/faculty?or=(email.eq.${encodeURIComponent(email)},faculty_id.eq.${encodeURIComponent(faculty_id)})&select=id`)).json();
    if (dup.length) return json(409, { error: 'A faculty record with this email or ID already exists' });
    const au = await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) });
    const auj = await au.json();
    if (!au.ok) return json(400, { error: auj.msg || auj.message || 'Could not create account' });
    const pr = await svc('/rest/v1/profiles', { method: 'POST', body: JSON.stringify({ id: auj.id, role: 'faculty', full_name }) });
    const fr = pr.ok && await svc('/rest/v1/faculty', { method: 'POST', body: JSON.stringify({ user_id: auj.id, full_name, faculty_id, email, department, position, photo_url: photo_url || null }) });
    if (!pr.ok || !fr.ok) { await svc(`/auth/v1/admin/users/${auj.id}`, { method: 'DELETE' }); return json(500, { error: 'Could not save faculty record' }); }
    return json(200, { ok: true });
  }

  if (b.action === 'delete') {
    const r = await (await svc(`/rest/v1/faculty?id=eq.${b.id}&select=user_id`)).json();
    if (!r[0]) return json(404, { error: 'Not found' });
    await svc(`/rest/v1/faculty?id=eq.${b.id}`, { method: 'DELETE' });
    if (r[0].user_id) await svc(`/auth/v1/admin/users/${r[0].user_id}`, { method: 'DELETE' });
    return json(200, { ok: true });
  }
  return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('manage-faculty function error:', error);
    return json(500, { error: 'The faculty service encountered a server error. Check the Netlify Function logs and environment variables.' });
  }
};
