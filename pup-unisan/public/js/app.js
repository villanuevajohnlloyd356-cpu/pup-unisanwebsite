import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const admissionUrl = () => 'apply.html';
export const DEFAULTS = {"intro": "Tanglaw ng Bayan (Light of Nation). A satellite campus of the Polytechnic University of the Philippines in Unisan, Quezon.", "history": "PUP Unisan was established in 1987, originally conceived by local officials as a contribution to the welfare of out-of-school youth in the area. It began as a vocational-technical school before growing into a full satellite campus of the Polytechnic University of the Philippines.", "background": "The Polytechnic University of the Philippines is a state university with campuses across the country. Unisan Campus is part of the PUP System and offers undergraduate and graduate programs to students from Unisan and nearby towns.", "vision": "A Leading Comprehensive Polytechnic University in Asia.", "mission": "Advance an Inclusive, Equitable, and Globally Relevant Polytechnic Education Towards National Development.", "motto": "Tanglaw ng Bayan (Light of Nation)", "established": "1987", "colors": "Maroon and Gold", "address": "Brgy. Kalilayan Ibaba, Unisan, Quezon", "email": "unisan@pup.edu.ph", "admission_url": "https://www.pup.edu.ph/iapply"};
let _s;
export const getSettings = () => _s || (_s = Promise.resolve(sb.from('site_settings').select('key,value')).then(({ data }) => {
  const o = { ...DEFAULTS }; (data || []).forEach(r => { if (r.value && r.value.trim()) o[r.key] = r.value; }); return o;
}).catch(() => ({ ...DEFAULTS })));
export const fmt = t => esc(t).split(/\n{2,}/).map(p => /^## /.test(p) ? `<h2>${p.slice(3)}</h2>`
  : /^(- .*(\n|$))+$/.test(p) ? '<ul>' + p.split('\n').map(l => `<li>${l.slice(2)}</li>`).join('') + '</ul>'
  : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const $ = (s, r = document) => r.querySelector(s);
export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

const NAV = [['index.html', 'Home'], ['programs.html', 'Academic Programs'], ['about.html', 'About'], ['announcements.html', 'Announcements'], ['apply.html', 'Apply for Admission'], ['login.html', 'Login']];
export function layout(active) {
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="top"><div class="wrap">
    <a class="brand" href="index.html"><span class="logo">PUP</span><span class="bt"><b>Polytechnic University of the Philippines</b><small>Unisan Campus</small></span></a>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">Menu</button></div></header>
  <nav id="drawer" aria-label="Main">${NAV.map(([h, n]) => `<a href="${h}" class="${h === active ? 'active' : ''}">${n}</a>`).join('')}</nav>
  <div id="scrim"></div>`);
  const t = o => { $('#drawer').classList.toggle('open', o); $('#scrim').classList.toggle('open', o); $('#burger').setAttribute('aria-expanded', o); };
  $('#burger').onclick = () => t(!$('#drawer').classList.contains('open'));
  $('#scrim').onclick = () => t(false);
  document.addEventListener('keydown', e => e.key === 'Escape' && t(false));
  const foot = x => `<div class="wrap fgrid"><div><strong>PUP Unisan Campus</strong><br>${esc(x.address)}<br>${esc(x.email)}</div>
    <div class="flinks"><a href="privacy.html">Privacy Policy</a><a href="apply.html">Admissions</a><a href="login.html">Staff login</a></div></div>
    <div class="wrap copy">&copy; 2026 Polytechnic University of the Philippines – Unisan Campus. All rights reserved.</div>`;
  if (!document.querySelector('footer')) document.body.insertAdjacentHTML('beforeend', `<footer id="ft">${foot(DEFAULTS)}</footer>`);
  getSettings().then(x => { const f = $('#ft'); if (f) f.innerHTML = foot(x); });
  Promise.resolve(sb.from('pages').select('slug,title').eq('published', true).eq('show_in_menu', true).order('sort_order')).then(({ data }) => {
    const lg = $('#drawer a[href="login.html"]'); (data || []).forEach(p => lg && lg.insertAdjacentHTML('beforebegin', `<a href="page.html?slug=${encodeURIComponent(p.slug)}">${esc(p.title)}</a>`));
  }).catch(() => {});
}
export function programCard(p) {
  return `<article class="card pc"><h3>${esc(p.name)}</h3>${p.abbreviation ? `<div class="abbr">${esc(p.abbreviation)}</div>` : ''}
    ${p.short_description ? `<p>${esc(p.short_description)}</p>` : ''}${p.is_placeholder ? '<span class="tag">Placeholder – not verified</span>' : ''}
    <a class="btn gold" href="program.html?slug=${encodeURIComponent(p.slug)}">View details</a></article>`;
}
export function annItem(a, full = false) {
  return `<article class="ann"><h3>${esc(a.title)}</h3><time>${fmtDate(a.published_at || a.created_at)}</time>
    <p>${full ? esc(a.body).replace(/\n/g, '<br>') : esc(a.body.slice(0, 160)) + (a.body.length > 160 ? '…' : '')}</p></article>`;
}
// Auth guard: returns {user, role, name} or redirects to login.
export async function requireRole(role) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return location.replace('login.html');
  const { data: p } = await sb.from('profiles').select('role,full_name').eq('id', session.user.id).single();
  if (!p || p.role !== role) { location.replace(p ? (p.role === 'admin' ? 'admin.html' : 'faculty.html') : 'login.html'); return null; }
  return { user: session.user, role: p.role, name: p.full_name, token: session.access_token };
}
export async function logout() { await sb.auth.signOut(); location.replace('login.html'); }
