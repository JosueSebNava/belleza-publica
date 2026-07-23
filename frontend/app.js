const state = {
  user: null,
  token: localStorage.getItem('beauty_token') || ''
};

const WHATSAPP_PHONE = '10000000000';
const WHATSAPP_BASE_MESSAGE = 'Hola, quiero reservar una cita en Elohim Estudio de uñas y pestañas para';

const els = {
  authActions: document.querySelector('#authActions'),
  authModal: document.querySelector('#authModal'),
  closeModal: document.querySelector('#closeModal'),
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.tab-panel'),
  loginForm: document.querySelector('#loginForm'),
  registerForm: document.querySelector('#registerForm'),
  bookingForm: document.querySelector('#bookingForm'),
  bookingName: document.querySelector('#bookingName'),
  bookingEmail: document.querySelector('#bookingEmail'),
  bookingPhone: document.querySelector('#bookingPhone'),
  bookingNote: document.querySelector('#bookingNote'),
  clientSummary: document.querySelector('#clientSummary'),
  clientAppointments: document.querySelector('#clientAppointments'),
  staffPanel: document.querySelector('#staffPanel'),
  appointmentTable: document.querySelector('#appointmentTable'),
  refreshAppointments: document.querySelector('#refreshAppointments'),
  toast: document.querySelector('#toast'),
  carouselSlides: document.querySelectorAll('.carousel-slide'),
  carouselDots: document.querySelector('#carouselDots')
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 4200);
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la acción.');
  return payload;
}

function setSession({ user, token }) {
  state.user = user;
  if (token) {
    state.token = token;
    localStorage.setItem('beauty_token', token);
  }
  localStorage.setItem('beauty_user', JSON.stringify(user));
  renderSession();
}

function clearSession() {
  state.user = null;
  state.token = '';
  localStorage.removeItem('beauty_token');
  localStorage.removeItem('beauty_user');
  renderSession();
}

function openModal(tab = 'login') {
  setTab(tab);
  els.authModal.showModal();
}

function setTab(tabName) {
  els.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
  els.panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tabName));
}

function renderSession() {
  const user = state.user;
  if (!user) {
    els.authActions.innerHTML = `
      <button class="ghost-btn" data-open-auth="login">Login</button>
      <button class="solid-btn" data-open-auth="register">Registrarse</button>
    `;
    els.clientSummary.textContent = 'No has iniciado sesión.';
    els.clientAppointments.innerHTML = '';
    els.bookingNote.textContent = 'Para agendar, inicia sesión o regístrate como cliente.';
    els.staffPanel.hidden = true;
    return;
  }

  els.authActions.innerHTML = `
    <span class="session-pill">${user.role === 'staff' ? 'Local' : 'Cliente'} · ${user.name}</span>
    <button class="ghost-btn" id="logoutBtn">Salir</button>
  `;

  if (user.role === 'client') {
    els.bookingName.value = user.name || '';
    els.bookingEmail.value = user.email || '';
    els.bookingPhone.value = user.phone || '';
    els.bookingNote.textContent = 'Tus datos están guardados para completar la agenda automáticamente.';
    els.clientSummary.innerHTML = `
      Sesión activa como <strong>${escapeHtml(user.name)}</strong><br>
      Correo: ${escapeHtml(user.email)}<br>
      Proveedor: ${escapeHtml(user.provider || 'email')}
    `;
    els.staffPanel.hidden = true;
    loadMyAppointments();
  } else {
    els.bookingNote.textContent = 'El miembro del local solo puede revisar citas. Usa una cuenta de cliente para agendar.';
    els.clientSummary.textContent = 'Sesión activa como miembro del local.';
    els.clientAppointments.innerHTML = '';
    els.staffPanel.hidden = false;
    loadStaffAppointments();
  }
}

async function loadMyAppointments() {
  if (!state.user || state.user.role !== 'client') return;
  try {
    const { appointments } = await api('/api/my-appointments');
    if (!appointments.length) {
      els.clientAppointments.innerHTML = '<div class="mini-card"><span>Aún no tienes citas registradas.</span></div>';
      return;
    }
    els.clientAppointments.innerHTML = appointments.slice(0, 4).map(item => `
      <div class="mini-card">
        <strong>${escapeHtml(item.service)}</strong>
        <span>${formatDate(item.date)} · ${escapeHtml(item.time)}</span>
        <span>${escapeHtml(item.status)}</span>
      </div>
    `).join('');
  } catch (error) {
    els.clientAppointments.innerHTML = '';
  }
}

async function loadStaffAppointments() {
  if (!state.user || state.user.role !== 'staff') return;
  try {
    const { appointments } = await api('/api/appointments');
    if (!appointments.length) {
      els.appointmentTable.innerHTML = '<div class="mini-card">No hay citas registradas todavía.</div>';
      return;
    }
    els.appointmentTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Correo</th>
            <th>Servicio</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${appointments.map(item => `
            <tr>
              <td>${escapeHtml(item.clientName)}</td>
              <td>${escapeHtml(item.clientEmail)}</td>
              <td>${escapeHtml(item.service)}</td>
              <td>${formatDate(item.date)}</td>
              <td>${escapeHtml(item.time)}</td>
              <td>${escapeHtml(item.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    toast(error.message);
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function openWhatsApp(service) {
  const message = `${WHATSAPP_BASE_MESSAGE} ${service}.`;
  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

function initCarousel() {
  const slides = Array.from(els.carouselSlides || []);
  if (!slides.length || !els.carouselDots) return;

  let activeIndex = 0;
  let intervalId;

  els.carouselDots.innerHTML = slides
    .map((_, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-carousel-dot="${index}" aria-label="Ver imagen ${index + 1}"></button>`)
    .join('');

  const dots = Array.from(els.carouselDots.querySelectorAll('button'));

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === activeIndex));
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === activeIndex));
  }

  function restartAutoPlay() {
    window.clearInterval(intervalId);
    intervalId = window.setInterval(() => showSlide(activeIndex + 1), 5200);
  }

  document.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
    showSlide(activeIndex - 1);
    restartAutoPlay();
  });

  document.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
    showSlide(activeIndex + 1);
    restartAutoPlay();
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      showSlide(Number(dot.dataset.carouselDot));
      restartAutoPlay();
    });
  });

  restartAutoPlay();
}

function initRevealAnimations() {
  const targets = document.querySelectorAll('.service-card, .model-card, .location-copy, .map-card, .booking-form, .panel');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  targets.forEach(target => {
    target.classList.add('reveal');
    observer.observe(target);
  });
}

document.addEventListener('click', async event => {
  const opener = event.target.closest('[data-open-auth]');
  if (opener) openModal(opener.dataset.openAuth);

  const whatsappButton = event.target.closest('[data-whatsapp-service]');
  if (whatsappButton) {
    openWhatsApp(whatsappButton.dataset.whatsappService);
  }

  if (event.target.id === 'logoutBtn') {
    try {
      await api('/api/logout', { method: 'POST', body: '{}' });
    } catch {
      // Ignore logout network errors; local state is still cleared.
    }
    clearSession();
    toast('Sesión cerrada.');
  }

  const social = event.target.closest('[data-provider]');
  if (social) {
    try {
      const payload = await api('/api/oauth-demo', {
        method: 'POST',
        body: JSON.stringify({ provider: social.dataset.provider })
      });
      setSession(payload);
      els.authModal.close();
      toast(payload.message);
    } catch (error) {
      toast(error.message);
    }
  }
});

els.closeModal.addEventListener('click', () => els.authModal.close());
els.tabs.forEach(tab => tab.addEventListener('click', () => setTab(tab.dataset.tab)));

els.loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const payload = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify(formToObject(els.loginForm))
    });
    setSession(payload);
    els.authModal.close();
    toast(payload.user.role === 'staff' ? 'Bienvenido al panel del local.' : 'Sesión iniciada. Ya puedes agendar.');
  } catch (error) {
    toast(error.message);
  }
});

els.registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const payload = await api('/api/register', {
      method: 'POST',
      body: JSON.stringify({ ...formToObject(els.registerForm), role: 'client' })
    });
    setSession(payload);
    els.authModal.close();
    toast('Cuenta creada. Tus datos quedaron guardados para futuras citas.');
  } catch (error) {
    toast(error.message);
  }
});

els.bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.user) {
    toast('Primero inicia sesión o crea una cuenta de cliente.');
    openModal('login');
    return;
  }
  if (state.user.role !== 'client') {
    toast('Los miembros del local no pueden agendar desde este formulario.');
    return;
  }
  try {
    const data = formToObject(els.bookingForm);
    const payload = await api('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    state.user.phone = data.phone || state.user.phone;
    localStorage.setItem('beauty_user', JSON.stringify(state.user));
    els.bookingForm.reset();
    els.bookingName.value = state.user.name || '';
    els.bookingEmail.value = state.user.email || '';
    els.bookingPhone.value = state.user.phone || '';
    toast(`Cita confirmada. ${payload.emailNotice}`);
    loadMyAppointments();
  } catch (error) {
    toast(error.message);
  }
});

els.refreshAppointments.addEventListener('click', loadStaffAppointments);

async function boot() {
  initCarousel();
  initRevealAnimations();

  const storedUser = localStorage.getItem('beauty_user');
  if (storedUser) {
    try {
      state.user = JSON.parse(storedUser);
      renderSession();
    } catch {
      clearSession();
    }
  }

  if (state.token) {
    try {
      const { user } = await api('/api/me');
      state.user = user;
      localStorage.setItem('beauty_user', JSON.stringify(user));
      renderSession();
    } catch {
      clearSession();
    }
  } else {
    renderSession();
  }
}

boot();
