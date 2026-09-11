document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#resume-form');
  const sheet = document.querySelector('#resume-sheet');
  const previewPanel = document.querySelector('#preview-panel');
  const saveStatus = document.querySelector('#save-status');
  const photoInput = document.querySelector('#photo-input');
  const photoPreview = document.querySelector('#photo-preview');
  const photoPlaceholder = document.querySelector('#photo-placeholder');
  const closeMobilePreview = document.querySelector('#close-mobile-preview');
  const STORAGE_KEY = 'siteCurriculoDraftV1';
  let photoData = '';
  let saveTimer = null;

  const repeaters = {
    formacoes: [
      { key: 'curso', label: 'Curso / formação', placeholder: 'Ex.: Técnico em Desenvolvimento de Sistemas' },
      { key: 'instituicao', label: 'Instituição', placeholder: 'Nome da instituição' },
      { key: 'periodo', label: 'Período', placeholder: 'Ex.: 2025 - 2026' }
    ],
    experiencias: [
      { key: 'cargo', label: 'Cargo / função', placeholder: 'Ex.: Estagiário de TI' },
      { key: 'empresa', label: 'Empresa / local', placeholder: 'Nome da empresa' },
      { key: 'periodo', label: 'Período', placeholder: 'Ex.: Fev/2026 - atual' },
      { key: 'descricao', label: 'Principais atividades', placeholder: 'Descreva brevemente suas atividades.', textarea: true, full: true }
    ],
    cursos: [
      { key: 'nome', label: 'Curso / certificação', placeholder: 'Ex.: Excel Básico' },
      { key: 'instituicao', label: 'Instituição', placeholder: 'Ex.: SENAI' },
      { key: 'ano', label: 'Ano / carga horária', placeholder: 'Ex.: 2026 - 20h' }
    ],
    habilidades: [
      { key: 'valor', label: 'Habilidade técnica', placeholder: 'Ex.: HTML, Excel, manutenção de computadores' }
    ],
    competencias: [
      { key: 'valor', label: 'Competência profissional', placeholder: 'Ex.: comunicação, organização, trabalho em equipe' }
    ],
    idiomas: [
      { key: 'idioma', label: 'Idioma', placeholder: 'Ex.: Inglês' },
      { key: 'nivel', label: 'Nível', placeholder: 'Ex.: Básico, intermediário, avançado' }
    ],
    projetos: [
      { key: 'nome', label: 'Nome do projeto / atividade', placeholder: 'Ex.: Site de vendas desenvolvido no curso' },
      { key: 'descricao', label: 'Descrição', placeholder: 'Explique o que você fez e o que aprendeu.', textarea: true, full: true }
    ]
  };

  const themes = {
    azul: ['#2563eb', '#eff6ff', '#173b76'],
    verde: ['#15803d', '#f0fdf4', '#14532d'],
    vinho: ['#9f1239', '#fff1f2', '#4c0519'],
    grafite: ['#334155', '#f1f5f9', '#172033'],
    roxo: ['#7c3aed', '#f5f3ff', '#3b0764'],
    petroleo: ['#0f766e', '#f0fdfa', '#134e4a'],
    terracota: ['#b45309', '#fff7ed', '#7c2d12'],
    dourado: ['#a16207', '#fefce8', '#713f12']
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function initials(name) {
    const parts = String(name || 'CV').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join('') || 'CV').toUpperCase();
  }

  function avatar(data, className = 'r-avatar') {
    if (data.photo) return `<div class="${className} r-avatar"><img src="${data.photo}" alt="Foto profissional"></div>`;
    return `<div class="${className} r-avatar"><strong>${esc(initials(data.nome))}</strong></div>`;
  }

  function contacts(data) {
    return [
      ['E-mail', data.email],
      ['Telefone', data.telefone],
      ['Local', data.cidade],
      ['LinkedIn', data.linkedin],
      ['Portfólio', data.portfolio]
    ].filter(([, value]) => value);
  }

  function contactsInline(data) {
    return contacts(data).map(([, value]) => `<span class="r-contact">${esc(value)}</span>`).join('');
  }

  function contactsLabeled(data) {
    return contacts(data).map(([label, value]) => `<div class="r-contact"><strong>${esc(label)}</strong>${esc(value)}</div>`).join('');
  }

  function valuesOf(items = []) {
    return items.map(item => item.valor).filter(Boolean);
  }

  function tags(values = []) {
    const filtered = values.filter(Boolean);
    return filtered.length ? `<div class="tag-list">${filtered.map(value => `<span class="tag">${esc(value)}</span>`).join('')}</div>` : '';
  }

  function entry(title, subtitle = '', period = '', description = '') {
    if (![title, subtitle, period, description].some(Boolean)) return '';
    return `<div class="r-entry">
      <div class="r-entry-head">
        <div>${title ? `<h3>${esc(title)}</h3>` : ''}${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}</div>
        ${period ? `<span class="period">${esc(period)}</span>` : ''}
      </div>
      ${description ? `<p class="desc">${esc(description)}</p>` : ''}
    </div>`;
  }

  function section(title, content, extra = '') {
    if (!content) return '';
    return `<section class="section ${extra}"><h2>${esc(title)}</h2>${content}</section>`;
  }

  function entries(data, type) {
    if (type === 'formacoes') return data.formacoes.map(item => entry(item.curso, item.instituicao, item.periodo)).join('');
    if (type === 'experiencias') return data.experiencias.map(item => entry(item.cargo, item.empresa, item.periodo, item.descricao)).join('');
    if (type === 'cursos') return data.cursos.map(item => entry(item.nome, item.instituicao, item.ano)).join('');
    if (type === 'idiomas') return data.idiomas.map(item => entry(item.idioma, item.nivel)).join('');
    if (type === 'projetos') return data.projetos.map(item => entry(item.nome, '', '', item.descricao)).join('');
    return '';
  }

  function collectSection(sectionName) {
    return $$(`#${sectionName} .repeat-item`).map(item => {
      const obj = {};
      $$('[data-key]', item).forEach(field => obj[field.dataset.key] = field.value.trim());
      return obj;
    }).filter(item => Object.values(item).some(Boolean));
  }

  function collectData() {
    return {
      layout: $('input[name="layout"]:checked')?.value || 'moderno',
      theme: $('input[name="theme"]:checked')?.value || 'azul',
      photo: photoData,
      nome: $('#nome').value.trim(),
      cargo: $('#cargo').value.trim(),
      email: $('#email').value.trim(),
      telefone: $('#telefone').value.trim(),
      cidade: $('#cidade').value.trim(),
      linkedin: $('#linkedin').value.trim(),
      portfolio: $('#portfolio').value.trim(),
      objetivo: $('#objetivo').value.trim(),
      resumo: $('#resumo').value.trim(),
      formacoes: collectSection('formacoes'),
      experiencias: collectSection('experiencias'),
      cursos: collectSection('cursos'),
      habilidades: collectSection('habilidades'),
      competencias: collectSection('competencias'),
      idiomas: collectSection('idiomas'),
      projetos: collectSection('projetos')
    };
  }

  function baseIdentity(data) {
    return {
      name: esc(data.nome || 'Seu nome completo'),
      role: esc(data.cargo || 'Área ou cargo desejado')
    };
  }

  function renderModern(data) {
    const id = baseIdentity(data);
    const side = [
      contacts(data).length ? `<section><h2>Contato</h2>${contactsLabeled(data)}</section>` : '',
      valuesOf(data.habilidades).length ? `<section><h2>Habilidades</h2>${tags(valuesOf(data.habilidades))}</section>` : '',
      valuesOf(data.competencias).length ? `<section><h2>Competências</h2>${tags(valuesOf(data.competencias))}</section>` : '',
      data.idiomas.length ? `<section><h2>Idiomas</h2>${data.idiomas.map(i => `<div class="r-contact"><strong>${esc(i.idioma || 'Idioma')}</strong>${esc(i.nivel || '')}</div>`).join('')}</section>` : '',
      data.cursos.length ? `<section><h2>Cursos</h2>${data.cursos.map(i => `<div class="r-contact"><strong>${esc(i.nome || 'Curso')}</strong>${esc([i.instituicao, i.ano].filter(Boolean).join(' • '))}</div>`).join('')}</section>` : ''
    ].join('');

    sheet.className = 'resume-sheet layout-moderno';
    sheet.innerHTML = `<aside class="side">${avatar(data)}${side}</aside><main class="main">
      <header><h1>${id.name}</h1><p class="role">${id.role}</p></header>
      ${section('Sobre mim', data.resumo ? `<p class="body-text">${esc(data.resumo)}</p>` : '')}
      ${section('Objetivo profissional', data.objetivo ? `<p class="body-text">${esc(data.objetivo)}</p>` : '')}
      ${section('Experiência', entries(data, 'experiencias'))}
      ${section('Formação', entries(data, 'formacoes'))}
      ${section('Projetos', entries(data, 'projetos'))}
    </main>`;
  }

  function renderVisual(data) {
    const id = baseIdentity(data);
    const profile = [data.resumo ? `<p class="body-text">${esc(data.resumo)}</p>` : '', data.objetivo ? `<p class="body-text"><strong>Objetivo:</strong> ${esc(data.objetivo)}</p>` : ''].join('');
    const skills = [tags(valuesOf(data.habilidades)), tags(valuesOf(data.competencias))].join('');
    sheet.className = 'resume-sheet layout-visual';
    sheet.innerHTML = `<header class="visual-header">${avatar(data)}<div><h1>${id.name}</h1><p class="role">${id.role}</p><div class="contacts">${contactsInline(data)}</div></div></header>
      <div class="visual-grid">
        ${section('Perfil', profile, 'card')}
        ${section('Habilidades e competências', skills, 'card')}
        ${section('Experiência', entries(data, 'experiencias'), 'card wide')}
        ${section('Formação', entries(data, 'formacoes'), 'card')}
        ${section('Cursos', entries(data, 'cursos'), 'card')}
        ${section('Idiomas', entries(data, 'idiomas'), 'card')}
        ${section('Projetos', entries(data, 'projetos'), 'card wide')}
      </div>`;
  }

  function renderClassic(data) {
    const id = baseIdentity(data);
    sheet.className = 'resume-sheet layout-classico';
    sheet.innerHTML = `<header>${data.photo ? avatar(data) : ''}<h1>${id.name}</h1><p class="role">${id.role}</p><div class="contacts">${contactsInline(data)}</div></header>
      ${section('Objetivo profissional', data.objetivo ? `<p class="body-text">${esc(data.objetivo)}</p>` : '')}
      ${section('Resumo profissional', data.resumo ? `<p class="body-text">${esc(data.resumo)}</p>` : '')}
      ${section('Experiência profissional', entries(data, 'experiencias'))}
      ${section('Formação acadêmica', entries(data, 'formacoes'))}
      ${section('Cursos e certificações', entries(data, 'cursos'))}
      ${section('Habilidades', tags(valuesOf(data.habilidades)))}
      ${section('Competências', tags(valuesOf(data.competencias)))}
      ${section('Idiomas', entries(data, 'idiomas'))}
      ${section('Projetos e atividades', entries(data, 'projetos'))}`;
  }

  function renderMinimal(data) {
    const id = baseIdentity(data);
    const left = [
      section('Habilidades', tags(valuesOf(data.habilidades))),
      section('Competências', tags(valuesOf(data.competencias))),
      section('Idiomas', entries(data, 'idiomas')),
      section('Cursos', entries(data, 'cursos'))
    ].join('');
    const right = [
      section('Perfil', data.resumo ? `<p class="body-text">${esc(data.resumo)}</p>` : ''),
      section('Objetivo', data.objetivo ? `<p class="body-text">${esc(data.objetivo)}</p>` : ''),
      section('Experiência', entries(data, 'experiencias')),
      section('Formação', entries(data, 'formacoes')),
      section('Projetos', entries(data, 'projetos'))
    ].join('');
    sheet.className = 'resume-sheet layout-minimalista';
    sheet.innerHTML = `<header><div><h1>${id.name}</h1><p class="role">${id.role}</p></div>${data.photo ? avatar(data) : ''}</header><div class="contacts">${contactsInline(data)}</div><div class="minimal-grid"><aside>${left}</aside><main>${right}</main></div>`;
  }

  function renderTech(data) {
    const id = baseIdentity(data);
    const main = [
      section('Resumo', data.resumo ? `<p class="body-text">${esc(data.resumo)}</p>` : ''),
      section('Objetivo', data.objetivo ? `<p class="body-text">${esc(data.objetivo)}</p>` : ''),
      section('Experiência', entries(data, 'experiencias')),
      section('Projetos', entries(data, 'projetos'))
    ].join('');
    const side = [
      section('Stack / habilidades', tags(valuesOf(data.habilidades))),
      section('Competências', tags(valuesOf(data.competencias))),
      section('Formação', entries(data, 'formacoes')),
      section('Cursos', entries(data, 'cursos')),
      section('Idiomas', entries(data, 'idiomas'))
    ].join('');
    sheet.className = 'resume-sheet layout-tech';
    sheet.innerHTML = `<header class="tech-head">${avatar(data)}<div><h1>${id.name}</h1><p class="role">${id.role}</p><div class="contacts">${contactsInline(data)}</div></div></header><div class="tech-body"><main>${main}</main><aside>${side}</aside></div>`;
  }

  function renderElegant(data) {
    const id = baseIdentity(data);
    const left = [
      section('Contato', contactsLabeled(data)),
      section('Habilidades', tags(valuesOf(data.habilidades))),
      section('Competências', tags(valuesOf(data.competencias))),
      section('Idiomas', entries(data, 'idiomas'))
    ].join('');
    const right = [
      section('Perfil profissional', data.resumo ? `<p class="body-text">${esc(data.resumo)}</p>` : ''),
      section('Objetivo', data.objetivo ? `<p class="body-text">${esc(data.objetivo)}</p>` : ''),
      section('Experiência', entries(data, 'experiencias')),
      section('Formação', entries(data, 'formacoes')),
      section('Cursos', entries(data, 'cursos')),
      section('Projetos', entries(data, 'projetos'))
    ].join('');
    sheet.className = 'resume-sheet layout-elegante';
    sheet.innerHTML = `<header>${data.photo ? avatar(data) : ''}<h1>${id.name}</h1><p class="role">${id.role}</p></header><div class="elegant-grid"><aside>${left}</aside><main>${right}</main></div>`;
  }

  function applyTheme(themeName) {
    const [accent, soft, dark] = themes[themeName] || themes.azul;
    sheet.style.setProperty('--accent', accent);
    sheet.style.setProperty('--accent-soft', soft);
    sheet.style.setProperty('--accent-dark', dark);
  }

  function render() {
    const data = collectData();
    applyTheme(data.theme);
    if (data.layout === 'visual') renderVisual(data);
    else if (data.layout === 'classico') renderClassic(data);
    else if (data.layout === 'minimalista') renderMinimal(data);
    else if (data.layout === 'tech') renderTech(data);
    else if (data.layout === 'elegante') renderElegant(data);
    else renderModern(data);
    applyTheme(data.theme);
    updateModelSelection();
  }

  function createField(field, value = '') {
    const label = document.createElement('label');
    if (field.full) label.classList.add('full');
    label.textContent = field.label;
    const input = field.textarea ? document.createElement('textarea') : document.createElement('input');
    input.dataset.key = field.key;
    input.placeholder = field.placeholder || '';
    input.value = value || '';
    if (field.textarea) input.rows = 3;
    label.appendChild(input);
    return label;
  }

  function addItem(sectionName, values = {}) {
    const container = $(`#${sectionName}`);
    const item = document.createElement('div');
    item.className = 'repeat-item';
    const fields = document.createElement('div');
    fields.className = `repeat-fields${repeaters[sectionName].length > 1 ? ' two' : ''}`;
    repeaters[sectionName].forEach(field => fields.appendChild(createField(field, values[field.key])));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-item';
    remove.textContent = 'Remover item';
    remove.addEventListener('click', () => {
      item.remove();
      onChanged();
    });
    item.append(fields, remove);
    container.appendChild(item);
  }

  function setPhoto(dataUrl = '') {
    photoData = dataUrl || '';
    if (photoData) {
      photoPreview.src = photoData;
      photoPreview.classList.add('show');
      photoPlaceholder.classList.add('hidden');
    } else {
      photoPreview.removeAttribute('src');
      photoPreview.classList.remove('show');
      photoPlaceholder.classList.remove('hidden');
    }
    render();
  }

  function resizePhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 700;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const context = canvas.getContext('2d');
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function updateModelSelection() {
    $$('.model-card').forEach(card => card.classList.toggle('selected', $('input[type="radio"]', card).checked));
  }

  function saveDraft(showMessage = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
      if (showMessage) {
        saveStatus.textContent = 'Rascunho salvo';
        setTimeout(() => saveStatus.textContent = 'Rascunho local', 1800);
      }
    } catch (error) {
      saveStatus.textContent = 'Não foi possível salvar';
    }
  }

  function scheduleAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveDraft(false), 500);
  }

  function onChanged() {
    render();
    saveStatus.textContent = 'Salvando...';
    scheduleAutoSave();
    setTimeout(() => {
      if (saveStatus.textContent === 'Salvando...') saveStatus.textContent = 'Rascunho local';
    }, 900);
  }

  function restoreDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      ['nome','cargo','email','telefone','cidade','linkedin','portfolio','objetivo','resumo'].forEach(key => {
        if ($(`#${key}`)) $(`#${key}`).value = data[key] || '';
      });
      const layout = $(`input[name="layout"][value="${data.layout || 'moderno'}"]`);
      const theme = $(`input[name="theme"][value="${data.theme || 'azul'}"]`);
      if (layout) layout.checked = true;
      if (theme) theme.checked = true;
      Object.keys(repeaters).forEach(sectionName => {
        $(`#${sectionName}`).innerHTML = '';
        (Array.isArray(data[sectionName]) ? data[sectionName] : []).forEach(item => addItem(sectionName, item));
      });
      setPhoto(data.photo || '');
      return true;
    } catch (error) {
      return false;
    }
  }

  function resetAll() {
    form.reset();
    photoData = '';
    photoInput.value = '';
    photoPreview.removeAttribute('src');
    photoPreview.classList.remove('show');
    photoPlaceholder.classList.remove('hidden');
    Object.keys(repeaters).forEach(sectionName => $(`#${sectionName}`).innerHTML = '');
    addItem('formacoes');
    addItem('habilidades');
    addItem('competencias');
    localStorage.removeItem(STORAGE_KEY);
    render();
    saveStatus.textContent = 'Rascunho local';
  }

  function printResume() {
    if (!form.reportValidity()) return;
    render();
    window.print();
  }

  $$('.add-item').forEach(button => button.addEventListener('click', () => {
    addItem(button.dataset.section);
    onChanged();
  }));

  form.addEventListener('input', onChanged);
  form.addEventListener('change', onChanged);
  form.addEventListener('submit', event => {
    event.preventDefault();
    printResume();
  });

  $('#save-draft').addEventListener('click', () => saveDraft(true));
  $('#clear-form').addEventListener('click', () => {
    if (confirm('Limpar todos os dados deste currículo?')) resetAll();
  });
  $('#btn-imprimir').addEventListener('click', printResume);
  $('#btn-imprimir-topo').addEventListener('click', printResume);

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem.');
      return;
    }
    try {
      setPhoto(await resizePhoto(file));
      saveDraft(false);
    } catch (error) {
      alert('Não foi possível carregar esta foto. Tente outra imagem.');
    }
  });

  $('#remove-photo').addEventListener('click', () => {
    photoInput.value = '';
    setPhoto('');
    saveDraft(false);
  });

  $('#preview-mobile').addEventListener('click', () => {
    render();
    previewPanel.classList.add('mobile-open');
    closeMobilePreview.classList.add('show');
    document.body.style.overflow = 'hidden';
  });

  closeMobilePreview.addEventListener('click', () => {
    previewPanel.classList.remove('mobile-open');
    closeMobilePreview.classList.remove('show');
    document.body.style.overflow = '';
  });

  const restored = restoreDraft();
  if (!restored) {
    addItem('formacoes');
    addItem('habilidades');
    addItem('competencias');
    render();
  }
});
