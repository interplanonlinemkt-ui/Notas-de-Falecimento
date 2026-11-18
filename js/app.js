(() => {
  const GREEN = '#275D31', GOLD = '#B18F51', INK = '#151515', PH = '#a5aca6';
  const SANS = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
  const SCRIPT = '"Yellowtail", cursive';
  const LOCAIS = window.LOCAIS || [];
  const CONFIG = window.GERADOR_CONFIG || {};

  const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

  // ---- Layouts (one per format) ----
  const LAYOUTS = {
    story: {
      label: 'story', w: 1080, h: 1920,
      top:  { x: 540, y: 140, size: 25 },
      oval: { cx: 540, cy: 466, rx: 240, ry: 268, b: 14 },
      head: { x: 540, y: [832, 868], size: 29 },
      name: { x: 540, y: 978, size: 98, min: 48, maxW: 920 },
      dates:{ y: 1078, size: 41, left: 335, right: 735, s: 1.25 },
      div:  { x: 540, y: 1154, h: 300 },
      cols: { left: 290, right: 790, titleY: 1169, titleSize: 29, lineY: 1236, size: 26, min: 18, maxW: 440, maxLines: 7 },
      // logo acima da área de resposta do Instagram
      footer: { y: 1590, logoW: 460, logoCY: 1700 },
    },
  };
  const FORMATS = ['story'];

  const $ = id => document.getElementById(id);
  const cv = $('cv');
  const logo = new Image(); logo.src = window.LOGO_BRANCO_DATA || 'assets/logo-branco.png';
  const current = 'story';

  // Photo state — offsets are stored relative to the oval size so framing carries across formats
  let photo = null, zoom = 1, offNX = 0, offNY = 0;

  // Paper texture
  const tex = document.createElement('canvas'); tex.width = 256; tex.height = 256;
  (() => {
    const t = tex.getContext('2d'), d = t.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 236 + (Math.random() * 8 - 4);
      d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255;
    }
    t.putImageData(d, 0, 0);
  })();

  const val = id => $(id).value.trim();
  const fmtCurta = iso => { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };
  const fmtLonga = iso => { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${parseInt(d,10)} DE ${MESES[parseInt(m,10)-1]} DE ${y}`; };
  const fmtHora = t => { if(!t) return ''; const [h,m]=t.split(':'); return m==='00' ? `${parseInt(h,10)}H` : `${parseInt(h,10)}H${m}`; };
  const txt = (v, ph) => v ? { t: v, ph: false } : { t: ph, ph: true };

  function locLines(loc, phNome){
    if (!loc) return [txt('', phNome), txt('', 'Endereço'), txt('', 'Cidade/UF')];
    const lines = [{ ...txt(loc.nome, phNome), bold: true }];
    if (loc.endereco || loc.livre) lines.push(txt(loc.endereco, 'Endereço'));
    lines.push(txt(loc.cidade ? (loc.uf ? `${loc.cidade}/${loc.uf}` : loc.cidade) : '', 'Cidade/UF'));
    return lines;
  }
  function data(){
    const velHora = val('velIni') ? (val('velFim') ? `${fmtHora(val('velIni'))} ÀS ${fmtHora(val('velFim'))}` : `A PARTIR DAS ${fmtHora(val('velIni'))}`) : '';
    const velLoc = velPicker.get();
    const sepLoc = $('mesmoLocal').checked ? velLoc : sepPicker.get();
    return {
      nome: txt(val('nome'), 'Nome do Falecido'),
      nasc: txt(fmtCurta(val('nasc')), 'DD/MM/AAAA'),
      falec: txt(fmtCurta(val('falec')), 'DD/MM/AAAA'),
      vel: [...locLines(velLoc, 'Local do velório'), txt(fmtLonga(val('velData')), 'Data'), txt(velHora, 'Horário')],
      sep: [...locLines(sepLoc, 'Local do sepultamento'), txt(fmtLonga(val('sepData')), 'Data'), txt(val('sepHora') ? `ÀS ${fmtHora(val('sepHora'))}` : '', 'Horário')],
    };
  }

  // ---- Location picker (search + "não cadastrado") ----
  const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const TIPO_LABEL = { velorio: 'Velório', cemiterio: 'Cemitério', ambos: 'Velório e cemitério' };

  function createPicker(root, tipos, placeholder){
    let state = { mode: 'none', item: null };
    const pool = () => LOCAIS.filter(l => tipos.includes(l.tipo));
    root.innerHTML = `
      <div class="pk-search">
        <input type="text" autocomplete="off" placeholder="${placeholder}" aria-autocomplete="list">
        <ul class="pk-list" role="listbox"></ul>
      </div>
      <div class="pk-card" hidden><div class="info"></div><button type="button">Trocar</button></div>
      <div class="pk-free" hidden>
        <p class="warn"><span>⚠ Local <b>não cadastrado</b> — confira nome e endereço.</span><button type="button">Buscar na lista</button></p>
        <label>Nome do local</label><input type="text" data-f="nome" maxlength="70">
        <label>Endereço</label><input type="text" data-f="endereco" maxlength="80" placeholder="Rua, número - bairro">
        <label>Cidade/UF</label><input type="text" data-f="cidade" maxlength="40" placeholder="Ex.: Presidente Prudente/SP">
      </div>`;
    const input = root.querySelector('.pk-search input'), list = root.querySelector('.pk-list');
    const search = root.querySelector('.pk-search'), card = root.querySelector('.pk-card'), free = root.querySelector('.pk-free');
    let results = [], active = 0;

    function show(){
      search.hidden = state.mode !== 'none';
      card.hidden = state.mode !== 'cad';
      free.hidden = state.mode !== 'livre';
      if (state.mode === 'cad'){
        const l = state.item;
        card.querySelector('.info').innerHTML = `<b>${esc(l.nome)}</b><span>${l.endereco ? esc(l.endereco) + '<br>' : '<i>Sem endereço cadastrado</i><br>'}${esc(l.cidade)}/${esc(l.uf)}${l.obs ? '<br>' + esc(l.obs) : ''}</span>`;
      }
      refresh();
    }
    function renderList(){
      const q = norm(input.value.trim());
      const words = q.split(/\s+/).filter(Boolean);
      results = pool().filter(l => { const hay = norm(`${l.nome} ${l.cidade} ${l.endereco}`); return words.every(w => hay.includes(w)); })
        .sort((a, b) => (b.interplan ? 1 : 0) - (a.interplan ? 1 : 0) || a.cidade.localeCompare(b.cidade) || a.nome.localeCompare(b.nome)).slice(0, 50);
      const items = results.map((l, i) => `<li role="option" data-i="${i}"><div class="n">${esc(l.nome)} ${l.interplan ? '<span class="chip ip">Interplan</span>' : ''}</div><div class="a">${l.endereco ? esc(l.endereco) + ' · ' : ''}${esc(l.cidade)}/${esc(l.uf)}</div></li>`);
      if (!results.length) items.push(`<li class="empty">Nenhum local encontrado${q ? ' para “' + esc(input.value.trim()) + '”' : ''}.</li>`);
      items.push(`<li class="free" data-free="1">+ Usar ${q ? '“' + esc(input.value.trim()) + '” como ' : ''}local não cadastrado</li>`);
      list.innerHTML = items.join('');
      active = Math.min(active, results.length);
      highlight();
      list.classList.add('on');
    }
    function highlight(){
      const lis = [...list.querySelectorAll('li[data-i],li[data-free]')];
      lis.forEach((li, i) => li.setAttribute('aria-selected', i === active ? 'true' : 'false'));
      lis[active]?.scrollIntoView({ block: 'nearest' });
    }
    function choose(i){
      list.classList.remove('on');
      if (i < results.length){ state = { mode: 'cad', item: results[i] }; }
      else {
        state = { mode: 'livre', item: null };
        free.querySelectorAll('input').forEach(x => x.value = '');
        free.querySelector('[data-f=nome]').value = input.value.trim();
        setTimeout(() => free.querySelector(input.value.trim() ? '[data-f=endereco]' : '[data-f=nome]').focus(), 0);
      }
      input.value = '';
      show();
    }
    input.addEventListener('focus', renderList);
    input.addEventListener('input', () => { active = 0; renderList(); });
    input.addEventListener('keydown', e => {
      const n = results.length + 1;
      if (e.key === 'ArrowDown'){ e.preventDefault(); active = (active + 1) % n; highlight(); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); active = (active - 1 + n) % n; highlight(); }
      else if (e.key === 'Enter'){ e.preventDefault(); choose(active); }
      else if (e.key === 'Escape'){ list.classList.remove('on'); }
    });
    list.addEventListener('mousedown', e => {
      const li = e.target.closest('li'); if (!li || li.classList.contains('empty')) return;
      e.preventDefault(); choose(li.dataset.free ? results.length : +li.dataset.i);
    });
    input.addEventListener('blur', () => setTimeout(() => list.classList.remove('on'), 120));
    card.querySelector('button').onclick = () => { state = { mode: 'none', item: null }; show(); input.focus(); };
    free.querySelector('.warn button').onclick = () => { const t = free.querySelector('[data-f=nome]').value; state = { mode: 'none', item: null }; show(); input.value = t; input.focus(); };
    free.querySelectorAll('input').forEach(x => x.addEventListener('input', refresh));

    return {
      get(){
        if (state.mode === 'cad') return state.item;
        if (state.mode === 'livre'){
          const f = k => free.querySelector(`[data-f=${k}]`).value.trim();
          return { nome: f('nome'), endereco: f('endereco'), cidade: f('cidade'), uf: '', livre: true };
        }
        return null;
      },
      complete(){ const l = this.get(); if (!l) return false; return l.livre ? !!(l.nome && l.endereco && l.cidade) : true; },
      isFree(){ return state.mode === 'livre'; },
      reset(){ state = { mode: 'none', item: null }; input.value = ''; show(); },
    };
  }

  // ---- Drawing ----
  function wrap(ctx, text, maxW){
    const words = text.split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    for (const w of words){
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawStar(ctx, cx, cy, r){
    ctx.beginPath();
    for (let i = 0; i < 10; i++){
      const rad = i % 2 === 0 ? r : r * 0.42, a = -Math.PI/2 + i * Math.PI/5;
      ctx.lineTo(cx + rad*Math.cos(a), cy + rad*Math.sin(a));
    }
    ctx.closePath(); ctx.fillStyle = GREEN; ctx.fill();
  }
  function drawCross(ctx, cx, cy, h){
    ctx.fillStyle = GREEN;
    const t = h * 0.27, r = Math.max(2, h * 0.06);
    ctx.beginPath(); ctx.roundRect(cx - t/2, cy - h/2, t, h, r); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx - h*0.36, cy - h*0.24, h*0.72, t, r); ctx.fill();
  }

  function photoGeom(L){
    const { rx, ry } = L.oval;
    const base = Math.max((rx*2)/photo.width, (ry*2)/photo.height);
    const s = base * zoom, w = photo.width*s, h = photo.height*s;
    const mx = Math.max(0, (w - rx*2)/2) / (rx*2), my = Math.max(0, (h - ry*2)/2) / (ry*2);
    return { w, h, mx, my };
  }

  function drawPhoto(ctx, L){
    const { cx, cy, rx, ry, b } = L.oval;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + b, ry + b, 0, 0, Math.PI*2); ctx.fillStyle = GOLD; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); ctx.clip();
    if (photo){
      const g = photoGeom(L);
      const nx = Math.min(g.mx, Math.max(-g.mx, offNX)), ny = Math.min(g.my, Math.max(-g.my, offNY));
      if ($('pb').checked) ctx.filter = 'grayscale(1)';
      ctx.drawImage(photo, cx - g.w/2 + nx*rx*2, cy - g.h/2 + ny*ry*2, g.w, g.h);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#d9dcd8'; ctx.fillRect(cx-rx, cy-ry, rx*2, ry*2);
      ctx.fillStyle = '#9aa29b'; ctx.font = `500 ${Math.round(rx*0.13)}px ${SANS}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FOTO', cx, cy);
    }
    ctx.restore();
  }

  function drawColumn(ctx, L, cx, title, lines){
    const C = L.cols;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK; ctx.font = `bold ${C.titleSize}px ${SANS}`;
    ctx.fillText(title, cx, C.titleY + C.titleSize * 0.35);
    let size = C.size, out;
    for (;;){
      ctx.font = `${size}px ${SANS}`;
      out = [];
      lines.forEach(l => { ctx.font = `${l.bold ? 'bold ' : ''}${size}px ${SANS}`; wrap(ctx, l.t.toUpperCase(), C.maxW).forEach(x => out.push({ t: x, ph: l.ph, bold: l.bold })); });
      if (out.length <= C.maxLines || size <= C.min) break;
      size--;
    }
    const lh = size * 1.25;
    out.forEach((l, i) => { ctx.font = `${l.bold ? 'bold ' : ''}${size}px ${SANS}`; ctx.fillStyle = l.ph ? PH : INK; ctx.fillText(l.t, cx, C.lineY + i*lh); });
  }

  function render(target, L){
    const ctx = target.getContext('2d');
    if (target.width !== L.w) target.width = L.w;
    if (target.height !== L.h) target.height = L.h;
    const D = data();

    ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(0, 0, L.w, L.h);

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
    ctx.font = `${L.top.size}px ${SANS}`;
    ctx.fillText('COMUNICADO DE DESPEDIDA', L.top.x, L.top.y);

    drawPhoto(ctx, L);

    ctx.fillStyle = INK; ctx.font = `bold ${L.head.size}px ${SANS}`;
    ctx.fillText('É COM PROFUNDO PESAR QUE', L.head.x, L.head.y[0]);
    ctx.fillText('COMUNICAMOS O FALECIMENTO DE:', L.head.x, L.head.y[1]);

    let ns = L.name.size;
    ctx.font = `${ns}px ${SCRIPT}`;
    while (ctx.measureText(D.nome.t).width > L.name.maxW && ns > L.name.min){ ns -= 2; ctx.font = `${ns}px ${SCRIPT}`; }
    ctx.fillStyle = D.nome.ph ? PH : '#000';
    ctx.fillText(D.nome.t, L.name.x, L.name.y);

    const Dt = L.dates, s = Dt.s;
    ctx.font = `${Dt.size}px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const group = (cx, icon, d) => {
      const tw = ctx.measureText(d.t).width, iw = 50*s, gap = 12*s, x0 = cx - (iw + gap + tw)/2;
      icon(x0 + iw/2);
      ctx.fillStyle = d.ph ? PH : INK; ctx.fillText(d.t, x0 + iw + gap, Dt.y + 1);
    };
    group(Dt.left,  x => drawStar(ctx, x, Dt.y, 25*s), D.nasc);
    group(Dt.right, x => drawCross(ctx, x, Dt.y, 46*s), D.falec);

    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(L.div.x - 0.5, L.div.y, 1, L.div.h);

    drawColumn(ctx, L, L.cols.left, 'VELÓRIO', D.vel);
    drawColumn(ctx, L, L.cols.right, 'SEPULTAMENTO', D.sep);

    ctx.fillStyle = GREEN; ctx.fillRect(0, L.footer.y, L.w, L.h - L.footer.y);
    if (logo.complete && logo.naturalWidth){
      const lw = L.footer.logoW, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, L.w/2 - lw/2, (L.footer.logoCY || (L.footer.y + (L.h - L.footer.y)/2)) - lh/2, lw, lh);
    }
  }

  function refresh(){ render(cv, LAYOUTS[current]); validate(); }

  // ---- Validation ----
  function setStatus(m, bad){ const s = $('status'); s.textContent = m; s.classList.toggle('bad', !!bad); }
  function validate(){
    const e = $('errDatas'); e.textContent = '';
    const n = val('nasc'), f = val('falec');
    if (n && f && f < n) e.textContent = 'A data de falecimento é anterior à de nascimento.';
    else if (f && val('velData') && val('velData') < f) e.textContent = 'A data do velório é anterior à do falecimento.';
    const missing = [];
    if (!photo) missing.push('foto ou imagem padrão');
    if (!val('nome')) missing.push('nome');
    if (!n || !f) missing.push('datas');
    if (!velPicker.complete() || !val('velData') || !val('velIni')) missing.push('velório');
    const sepOk = $('mesmoLocal').checked ? velPicker.complete() : sepPicker.complete();
    if (!sepOk || !val('sepData') || !val('sepHora')) missing.push('sepultamento');
    const ok = !missing.length && !e.textContent;
    ['btnPng','btnJpg'].forEach(id => $(id).disabled = !ok);
    setStatus(ok ? '' : (e.textContent ? 'Corrija as datas para baixar.' : 'Falta preencher: ' + missing.join(', ') + '.'));
    return ok;
  }

  const velPicker = createPicker($('velPicker'), ['velorio', 'ambos'], 'Buscar velório por nome ou cidade…');
  const sepPicker = createPicker($('sepPicker'), ['cemiterio', 'ambos'], 'Buscar cemitério por nome ou cidade…');

  // ---- Photo upload ----
  const dropDefault = $('drop').innerHTML;
  function usePhoto(src, label, modeloId){
    const img = new Image();
    img.onload = () => {
      photo = img; zoom = 1; offNX = 0; offNY = 0; $('zoom').value = 1;
      $('photoTools').classList.add('on'); cv.classList.add('draggable');
      $('drop').innerHTML = modeloId ? dropDefault : '<strong>Trocar foto</strong> · ' + label.replace(/[<>&]/g, '');
      document.querySelectorAll('.modelo').forEach(m => m.setAttribute('aria-pressed', m.dataset.id === modeloId ? 'true' : 'false'));
      refresh();
    };
    img.src = src;
  }
  function loadFile(f){
    if (!f || !f.type.startsWith('image/')) { setStatus('Envie um arquivo de imagem (JPG ou PNG).', true); return; }
    usePhoto(URL.createObjectURL(f), f.name, null);
  }
  // Imagens padrão (objetos) para quando não houver foto da pessoa — js/modelos.js
  const MODELOS = window.MODELOS_FOTO || [];
  const grid = $('modelos');
  if (grid) {
    grid.innerHTML = MODELOS.map(m => `<button type="button" class="modelo" data-id="${m.id}" aria-pressed="false" title="${m.nome}"><img src="${m.src}" alt=""><span>${m.nome}</span></button>`).join('');
    grid.addEventListener('click', e => {
      const b = e.target.closest('.modelo'); if (!b) return;
      const m = MODELOS.find(x => x.id === b.dataset.id); if (m) usePhoto(m.src, m.nome, m.id);
    });
  }
  $('drop').onclick = () => $('file').click();
  $('drop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } };
  $('file').onchange = e => loadFile(e.target.files[0]);
  ['dragover','dragenter'].forEach(ev => $('drop').addEventListener(ev, e => { e.preventDefault(); $('drop').classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => $('drop').addEventListener(ev, e => { e.preventDefault(); $('drop').classList.remove('over'); }));
  $('drop').addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
  $('zoom').oninput = e => { zoom = parseFloat(e.target.value); clampOffsets(); refresh(); };

  function clampOffsets(){
    if (!photo) return;
    // clamp against the most restrictive format so framing is valid everywhere
    let mx = Infinity, my = Infinity;
    FORMATS.forEach(k => { const g = photoGeom(LAYOUTS[k]); mx = Math.min(mx, g.mx); my = Math.min(my, g.my); });
    offNX = Math.min(mx, Math.max(-mx, offNX)); offNY = Math.min(my, Math.max(-my, offNY));
  }

  // Drag to pan + wheel zoom (in whichever format is on screen)
  let drag = null;
  const toCanvas = e => { const r = cv.getBoundingClientRect(), L = LAYOUTS[current]; return { x: (e.clientX - r.left) * L.w / r.width, y: (e.clientY - r.top) * L.h / r.height }; };
  const inOval = p => { const O = LAYOUTS[current].oval; return ((p.x-O.cx)/O.rx)**2 + ((p.y-O.cy)/O.ry)**2 <= 1.1; };
  cv.addEventListener('pointerdown', e => {
    if (!photo) return; const p = toCanvas(e); if (!inOval(p)) return;
    drag = { x: p.x, y: p.y, nx: offNX, ny: offNY }; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; const p = toCanvas(e), O = LAYOUTS[current].oval;
    offNX = drag.nx + (p.x - drag.x) / (O.rx*2); offNY = drag.ny + (p.y - drag.y) / (O.ry*2);
    clampOffsets(); refresh();
  });
  const endDrag = () => { drag = null; cv.classList.remove('dragging'); };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', e => {
    if (!photo) return; const p = toCanvas(e); if (!inOval(p)) return;
    e.preventDefault(); zoom = Math.min(3, Math.max(1, zoom - e.deltaY * 0.0015)); $('zoom').value = zoom; clampOffsets(); refresh();
  }, { passive: false });

  // ---- Inputs ----
  document.querySelectorAll('input:not([type=file]):not([type=range])').forEach(i => i.addEventListener('input', refresh));
  $('mesmoLocal').addEventListener('change', () => { $('sepPickerWrap').hidden = $('mesmoLocal').checked; refresh(); });
  $('velData').addEventListener('change', () => { if (!val('sepData')) { $('sepData').value = val('velData'); refresh(); } });

  $('btnLimpar').onclick = () => {
    document.querySelectorAll('input[type=text],input[type=date],input[type=time]').forEach(i => i.value = '');
    $('mesmoLocal').checked = false; $('sepPickerWrap').hidden = false; $('pb').checked = false;
    velPicker.reset(); sepPicker.reset();
    photo = null; $('photoTools').classList.remove('on'); cv.classList.remove('draggable');
    document.querySelectorAll('.modelo').forEach(m => m.setAttribute('aria-pressed', 'false'));
    $('drop').innerHTML = dropDefault; $('fallback').classList.remove('on'); refresh();
  };

  // ---- Export ----
  // No Claude (artifact) usa a capability de downloads; fora dele (GitHub Pages), download nativo do navegador.
  let downloads = null;
  try { window.claude?.use?.('downloads').then(d => { downloads = d; }).catch(() => {}); } catch (_) {}
  const nativeSave = (filename, blob) => {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const baseName = () => `comunicado-${slug(val('nome')) || 'despedida'}`;

  function renderOff(fmt){ const c = document.createElement('canvas'); render(c, LAYOUTS[fmt]); return c; }
  const toBlob = (c, mime) => new Promise(r => c.toBlob(r, mime, 0.95));

  async function save(filename, blob){
    if (downloads){
      try { await downloads.save({ filename, data: blob }); setStatus('Arquivo salvo: ' + filename); return true; }
      catch (err){ if (err && err.code === 'declined') { setStatus('Download cancelado.'); return true; } }
    }
    if (!window.claude){ nativeSave(filename, blob); setStatus('Arquivo baixado: ' + filename); return true; }
    return false;
  }
  function showFallback(canvases){
    const box = $('fallbackImgs'); box.innerHTML = '';
    canvases.forEach(c => { const i = new Image(); i.src = c.toDataURL('image/png'); box.appendChild(i); });
    $('fallback').classList.add('on');
    setStatus('Use as imagens abaixo para salvar.');
  }

  async function exportOne(ext){
    if (!validate()) return;
    const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
    const c = renderOff(current);
    const name = `${baseName()}-story-1080x1920.${ext}`;
    if (!(await save(name, await toBlob(c, mime)))) showFallback([c]);
  }
  $('btnPng').onclick = () => exportOne('png');
  $('btnJpg').onclick = () => exportOne('jpg');

  // ---- Redes sociais (js/config.js) ----
  document.querySelectorAll('[data-social]').forEach(a => {
    const url = (CONFIG.social || {})[a.dataset.social];
    if (url) a.href = url; else a.remove();
  });

  // ---- Modals (__modals) ----
  document.querySelectorAll('[data-modal]').forEach(b => b.addEventListener('click', () => $(b.dataset.modal).classList.add('on')));
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m || e.target.classList.contains('x')) m.classList.remove('on'); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on')); });


  logo.onload = refresh;
  refresh();
  document.fonts.load(`78px ${SCRIPT}`).then(refresh).catch(() => {});
  document.fonts.ready.then(refresh);
})();
