import { sb, $, esc, DEFAULTS } from './app.js';
const slug = t => String(t || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const T = {
  pr: { table: 'programs', key: 'slug', title: 'Programs', order: 'name', add: 'Add program', cols: [['name', 'Program'], ['abbreviation', 'Code']],
    fields: [['name', 'Program name', 'text', 1], ['abbreviation', 'Abbreviation (e.g. BSIT)', 'text', 1], ['short_description', 'Short description (shown on the card)', 'area'],
      ['overview', 'Overview', 'area'], ['description', 'Full description', 'area'], ['objectives', 'Objectives (one per line)', 'lines'], ['is_placeholder', 'Mark as placeholder / not verified', 'check']] },
  pg: { table: 'pages', key: 'id', title: 'Pages', order: 'sort_order', add: 'Add page', cols: [['title', 'Title'], ['slug', 'Link name'], ['published', 'Published'], ['show_in_menu', 'In menu']],
    fields: [['title', 'Page title', 'text', 1], ['slug', 'Link name (letters, numbers, dashes; leave blank to auto-fill)', 'text'], ['subtitle', 'Subtitle (optional)', 'text'],
      ['body', 'Content (use "## " for a heading, "- " for a list, blank line for a new paragraph)', 'area', 1], ['published', 'Publish this page', 'check'], ['show_in_menu', 'Show in the menu', 'check'], ['sort_order', 'Menu order (smaller shows first)', 'number']] }
};
const SET = [['intro', 'Home page introduction', 'area'], ['history', 'Our history', 'area'], ['background', 'University background', 'area'], ['vision', 'Vision', 'area'], ['mission', 'Mission', 'area'],
  ['motto', 'Motto', 'text'], ['established', 'Year established', 'text'], ['colors', 'School colors', 'text'], ['address', 'Address', 'text'], ['email', 'Contact email', 'text']];
const field = ([n, l, t, r], v) => {
  const val = t === 'lines' ? (v || []).join('\n') : v;
  if (t === 'check') return `<label><input type="checkbox" name="${n}" style="width:auto" ${v ? 'checked' : ''}> ${l}</label>`;
  if (t === 'area' || t === 'lines') return `<label>${l}<textarea name="${n}" rows="${n === 'body' ? 9 : 4}" ${r ? 'required' : ''}>${esc(val)}</textarea></label>`;
  return `<label>${l}<input name="${n}" type="${t === 'number' ? 'number' : 'text'}" value="${esc(val)}" ${r ? 'required' : ''}></label>`;
};
export async function renderExtra(tab, v, say) {
  if (tab === 'si') return settings(v, say);
  if (tab === 'ap') return applications(v, say);
  const c = T[tab]; v.innerHTML = '<p>Loading…</p>';
  const { data, error } = await sb.from(c.table).select('*').order(c.order);
  if (error) { v.innerHTML = ''; return say('Could not load ' + c.title.toLowerCase() + '.', false); }
  const rows = data || [];
  v.innerHTML = `<div class="row" style="margin:0 0 12px"><input id="q" type="search" placeholder="Search ${c.title.toLowerCase()}" style="max-width:280px"><button class="btn" id="add">${c.add}</button></div>
  <div class="tw"><table><thead><tr>${c.cols.map(x => `<th>${x[1]}</th>`).join('')}<th>Actions</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const draw = () => { const q = $('#q').value.toLowerCase();
    $('#tb').innerHTML = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q)).map(r => `<tr>${c.cols.map(([k]) => `<td>${typeof r[k] === 'boolean' ? (r[k] ? 'Yes' : 'No') : esc(r[k])}</td>`).join('')}
      <td><button class="btn sm ghost" data-a="e" data-i="${esc(r[c.key])}">Edit</button> <button class="btn sm danger" data-a="d" data-i="${esc(r[c.key])}">Delete</button></td></tr>`).join('') || `<tr><td colspan="${c.cols.length + 1}">Nothing here yet.</td></tr>`; };
  $('#q').oninput = draw; draw();
  const form = a => {
    const n = !a, d0 = a || (tab === 'pg' ? { published: true, show_in_menu: true, sort_order: 100 } : { is_placeholder: false });
    $('#df').innerHTML = `<h2>${n ? c.add : 'Edit'}</h2>${c.fields.map(f => field(f, d0[f[0]])).join('')}<div id="fe" role="alert"></div><div class="row"><button class="btn">Save</button><button class="btn ghost" type="button" id="cx">Cancel</button></div>`;
    $('#cx').onclick = () => $('#dlg').close(); $('#dlg').showModal();
    $('#df').onsubmit = async ev => { ev.preventDefault(); const f = new FormData($('#df')), row = {}, er = t => $('#fe').innerHTML = `<p class="msg err">${esc(t)}</p>`;
      for (const [k, , t, r] of c.fields) { let x = f.get(k);
        if (t === 'check') x = x === 'on'; else if (t === 'lines') x = (x || '').split('\n').map(s => s.trim()).filter(Boolean); else if (t === 'number') x = Number(x || 100); else x = (x || '').trim();
        if (r && !x) return er('Fill in all required fields.'); row[k] = x; }
      if (tab === 'pr') { if (n) row.slug = slug(row.abbreviation || row.name); }
      if (tab === 'pg') { row.slug = slug(row.slug || row.title); if (!row.slug) return er('Enter a valid page title.'); }
      const { error } = n ? await sb.from(c.table).insert(row) : await sb.from(c.table).update(row).eq(c.key, a[c.key]);
      if (error) return er(error.code === '23505' ? 'That link name already exists. Use a different one.' : 'Could not save. Try again.');
      $('#dlg').close(); say('Saved.'); renderExtra(tab, v, say); };
  };
  $('#add').onclick = () => form();
  $('#tb').onclick = async e => { const b = e.target.closest('button'); if (!b) return; const r = rows.find(x => String(x[c.key]) === b.dataset.i);
    if (b.dataset.a === 'e') form(r);
    if (b.dataset.a === 'd' && confirm('Delete "' + (r.name || r.title) + '"? This cannot be undone.')) { const { error } = await sb.from(c.table).delete().eq(c.key, r[c.key]); error ? say('Could not delete.', false) : (say('Deleted.'), renderExtra(tab, v, say)); } };
}
async function settings(v, say) {
  const { data, error } = await sb.from('site_settings').select('*'); if (error) return say('Could not load site info.', false);
  const cur = { ...DEFAULTS }; (data || []).forEach(r => { if (r.value) cur[r.key] = r.value; });
  v.innerHTML = `<p>Edit the text shown on the Home, About and footer sections.</p><form id="sf">${SET.map(([k, l, t]) => field([k, l, t], cur[k])).join('')}<button class="btn">Save changes</button></form>`;
  $('#sf').onsubmit = async ev => { ev.preventDefault(); const f = new FormData($('#sf'));
    const { error } = await sb.from('site_settings').upsert(SET.map(([k]) => ({ key: k, value: (f.get(k) || '').trim() })), { onConflict: 'key' });
    error ? say('Could not save.', false) : say('Site info saved.'); };
}

const ST = { new: 'New', reviewing: 'Under review', contacted: 'Contacted', accepted: 'Accepted', closed: 'Closed' };
async function applications(v, say) {
  const { data, error } = await sb.from('applications').select('*').order('created_at', { ascending: false });
  if (error) return say('Could not load applications.', false);
  const rows = data || [];
  v.innerHTML = `<div class="row" style="margin:0 0 12px"><input id="q" type="search" placeholder="Search applicants" style="max-width:240px"><select id="fs" style="max-width:190px"><option value="">All statuses</option>${Object.entries(ST).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn ghost" id="csv">Export CSV</button></div>
  <div class="tw"><table><thead><tr><th>Applicant</th><th>Program</th><th>Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const list = () => { const q = $('#q').value.toLowerCase(), s = $('#fs').value; return rows.filter(r => (!s || r.status === s) && JSON.stringify(r).toLowerCase().includes(q)); };
  const draw = () => { $('#tb').innerHTML = list().map(r => `<tr><td>${esc(r.full_name)}</td><td>${esc(r.program_choice)}</td><td>${esc(r.applicant_type)}</td><td>${new Date(r.created_at).toLocaleDateString('en-PH')}</td><td>${ST[r.status] || esc(r.status)}</td>
    <td><button class="btn sm ghost" data-a="v" data-i="${r.id}">View</button> <button class="btn sm danger" data-a="d" data-i="${r.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="6">No applications yet.</td></tr>'; };
  $('#q').oninput = draw; $('#fs').onchange = draw; draw();
  $('#csv').onclick = () => { const cols = ['created_at', 'full_name', 'applicant_type', 'program_choice', 'email', 'phone', 'birth_date', 'address', 'last_school', 'message', 'status', 'admin_notes'];
    const q = x => '"' + String(x ?? '').replace(/"/g, '""') + '"';
    const csv = [cols.join(',')].concat(list().map(r => cols.map(c => q(r[c])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'applications.csv'; a.click(); };
  $('#tb').onclick = async e => { const b = e.target.closest('button'); if (!b) return; const r = rows.find(x => x.id === b.dataset.i);
    if (b.dataset.a === 'd' && confirm('Delete the application of ' + r.full_name + '?')) { const { error } = await sb.from('applications').delete().eq('id', r.id); error ? say('Could not delete.', false) : (say('Application deleted.'), applications(v, say)); }
    if (b.dataset.a === 'v') { $('#df').innerHTML = `<h2>${esc(r.full_name)}</h2><p><strong>Reference:</strong> ${r.id.slice(0, 8).toUpperCase()}<br><strong>Applying as:</strong> ${esc(r.applicant_type)}<br><strong>Program:</strong> ${esc(r.program_choice)}<br><strong>Email:</strong> ${esc(r.email)}<br><strong>Phone:</strong> ${esc(r.phone)}<br><strong>Birth date:</strong> ${esc(r.birth_date || '—')}<br><strong>Address:</strong> ${esc(r.address || '—')}<br><strong>Last school:</strong> ${esc(r.last_school || '—')}<br><strong>Message:</strong> ${esc(r.message || '—')}</p>
      <label>Status<select name="status">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>Admin notes<textarea name="admin_notes" rows="3">${esc(r.admin_notes)}</textarea></label>
      <div id="fe" role="alert"></div><div class="row"><button class="btn">Save</button><button class="btn ghost" type="button" id="cx">Close</button></div>`;
      $('#cx').onclick = () => $('#dlg').close(); $('#dlg').showModal();
      $('#df').onsubmit = async ev => { ev.preventDefault(); const f = new FormData($('#df'));
        const { error } = await sb.from('applications').update({ status: f.get('status'), admin_notes: (f.get('admin_notes') || '').trim() || null }).eq('id', r.id);
        if (error) return $('#fe').innerHTML = '<p class="msg err">Could not save.</p>'; $('#dlg').close(); say('Application updated.'); applications(v, say); }; } };
}
