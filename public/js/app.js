document.addEventListener('DOMContentLoaded', () => {
  // Elementos de métricas
  const metricTotalTasks = document.getElementById('metricTotalTasks');
  const metricOverdueTasks = document.getElementById('metricOverdueTasks');
  const metricActiveCommitments = document.getElementById('metricActiveCommitments');
  const metricCompletedTasks = document.getElementById('metricCompletedTasks');

  // Contenedores y filtros
  const tasksContainer = document.getElementById('tasksContainer');
  const commitmentsContainer = document.getElementById('commitmentsContainer');
  const filterTaskStatus = document.getElementById('filterTaskStatus');
  const filterTaskPriority = document.getElementById('filterTaskPriority');
  const filterCommitmentStatus = document.getElementById('filterCommitmentStatus');

  // Formularios y contadores
  const formNuevaTarea = document.getElementById('formNuevaTarea');
  const taskTitle = document.getElementById('taskTitle');
  const taskTitleCounter = document.getElementById('taskTitleCounter');
  const taskDesc = document.getElementById('taskDesc');
  const taskDescCounter = document.getElementById('taskDescCounter');
  const taskDueDate = document.getElementById('taskDueDate');

  const formNuevoCompromiso = document.getElementById('formNuevoCompromiso');
  const commTitle = document.getElementById('commTitle');
  const commTitleCounter = document.getElementById('commTitleCounter');
  const commStartDate = document.getElementById('commStartDate');
  const commEndDate = document.getElementById('commEndDate');
  const durationBadge = document.getElementById('durationBadge');
  const conflictAlert = document.getElementById('conflictAlert');
  const formSwitcherButtons = document.querySelectorAll('[data-form-target]');
  const quickCreateBody = document.getElementById('quickCreateBody');
  const collapseToggle = document.querySelector('.collapse-toggle');

  // Toast
  const toastEl = document.getElementById('appToast');
  const toastMessage = document.getElementById('toastMessage');
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });

  function showToast(msg, isError = false) {
    toastMessage.textContent = msg;
    toastEl.className = `toast align-items-center border-0 shadow-lg ${isError ? 'text-bg-danger' : 'text-bg-dark'}`;
    toast.show();
  }

  // Establecer fecha mínima para nuevas entradas.
  const now = new Date();
  const nowIsoLocal = toLocalDateTimeValue(now);
  if (taskDueDate) taskDueDate.min = nowIsoLocal;
  if (commStartDate) commStartDate.min = nowIsoLocal;

  // Contadores de caracteres
  taskTitle.addEventListener('input', () => {
    taskTitleCounter.textContent = `${taskTitle.value.length} / 100`;
    if (taskTitle.value.length >= 90) taskTitleCounter.classList.add('warning');
    else taskTitleCounter.classList.remove('warning');
  });

  taskDesc.addEventListener('input', () => {
    taskDescCounter.textContent = `${taskDesc.value.length} / 500`;
    if (taskDesc.value.length >= 450) taskDescCounter.classList.add('warning');
    else taskDescCounter.classList.remove('warning');
  });

  commTitle.addEventListener('input', () => {
    commTitleCounter.textContent = `${commTitle.value.length} / 100`;
    if (commTitle.value.length >= 90) commTitleCounter.classList.add('warning');
    else commTitleCounter.classList.remove('warning');
  });

  // Validación de duración de compromiso en tiempo real (RN-04)
  function checkCommitmentDuration() {
    if (!commStartDate.value || !commEndDate.value) {
      commEndDate.setCustomValidity('');
      durationBadge.textContent = 'La fecha de fin debe ser posterior al inicio y durar al menos 15 minutos.';
      durationBadge.classList.remove('is-invalid', 'is-valid');
      return false;
    }

    const start = new Date(commStartDate.value);
    const end = new Date(commEndDate.value);
    const diffMin = (end.getTime() - start.getTime()) / (1000 * 60);

    if (diffMin <= 0) {
      commEndDate.setCustomValidity('La fecha de fin debe ser posterior a la fecha de inicio.');
      durationBadge.textContent = 'La fecha de fin debe ser posterior a la fecha de inicio.';
      durationBadge.classList.add('is-invalid');
      durationBadge.classList.remove('is-valid');
      return false;
    } else if (diffMin < 15) {
      commEndDate.setCustomValidity('La duración del compromiso debe ser de al menos 15 minutos.');
      durationBadge.textContent = `La duración es de ${diffMin} minutos; debe ser de al menos 15.`;
      durationBadge.classList.add('is-invalid');
      durationBadge.classList.remove('is-valid');
      return false;
    } else {
      commEndDate.setCustomValidity('');
      durationBadge.textContent = `Duración válida: ${diffMin} minutos.`;
      durationBadge.classList.add('is-valid');
      durationBadge.classList.remove('is-invalid');
      return true;
    }
  }

  commStartDate.addEventListener('change', () => {
    const minEnd = new Date(commStartDate.value);
    if (!Number.isNaN(minEnd.getTime())) {
      minEnd.setMinutes(minEnd.getMinutes() + 15);
      commEndDate.min = toLocalDateTimeValue(minEnd);
    } else {
      commEndDate.removeAttribute('min');
    }
    checkCommitmentDuration();
  });
  commStartDate.addEventListener('input', checkCommitmentDuration);
  commEndDate.addEventListener('input', checkCommitmentDuration);
  commEndDate.addEventListener('change', checkCommitmentDuration);

  formSwitcherButtons.forEach(button => {
    button.addEventListener('click', () => {
      const showTaskForm = button.dataset.formTarget === 'task';
      formNuevaTarea.classList.toggle('d-none', !showTaskForm);
      formNuevoCompromiso.classList.toggle('d-none', showTaskForm);
      formSwitcherButtons.forEach(item => {
        const isActive = item === button;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
    });
  });

  if (quickCreateBody && collapseToggle) {
    quickCreateBody.addEventListener('shown.bs.collapse', () => {
      collapseToggle.textContent = '−';
      collapseToggle.setAttribute('aria-expanded', 'true');
    });
    quickCreateBody.addEventListener('hidden.bs.collapse', () => {
      collapseToggle.textContent = '+';
      collapseToggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Cargar Tareas
  let tasksList = [];
  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        tasksList = data.data;
        renderTasks();
        updateMetrics();
      }
    } catch (err) {
      showToast('Error al cargar tareas: ' + err.message, true);
    }
  }

  // Cargar Compromisos
  let commitmentsList = [];
  async function loadCommitments() {
    try {
      const res = await fetch('/api/commitments');
      const data = await res.json();
      if (data.success) {
        commitmentsList = data.data;
        renderCommitments();
        updateMetrics();
      }
    } catch (err) {
      showToast('Error al cargar compromisos: ' + err.message, true);
    }
  }

  // Renderizar Tareas
  function renderTasks() {
    const statusFilter = filterTaskStatus.value;
    const priorityFilter = filterTaskPriority.value;

    const filtered = tasksList.filter(t => {
      const matchStatus = statusFilter === 'TODOS' || t.estado === statusFilter;
      const matchPriority = priorityFilter === 'TODOS' || t.prioridad === priorityFilter;
      return matchStatus && matchPriority;
    });

    if (filtered.length === 0) {
      tasksContainer.innerHTML = `
        <div class="col-12 text-center py-5 text-muted fst-italic">
          No hay tareas que coincidan con los filtros aplicados.
        </div>`;
      return;
    }

    tasksContainer.innerHTML = filtered.map(t => {
      const isPast = new Date(t.fechaVencimiento) < new Date() && (t.estado === 'PENDIENTE' || t.estado === 'EN_PROCESO');
      const tags = (t.etiquetas || []).map(tag => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join('');
      const isTerminal = t.estado === 'COMPLETADA' || t.estado === 'CANCELADA';

      return `
        <div class="col-12 col-lg-6">
          <div class="task-card d-flex flex-column justify-content-between">
            <div>
              <div class="card-accent-bar bar-task mb-2 rounded"></div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge badge-prioridad-${t.prioridad} rounded-pill px-2 py-1 small">${t.prioridad}</span>
                <span class="badge badge-estado-${t.estado} rounded-pill px-2 py-1 small">${t.estado.replace('_', ' ')}</span>
              </div>
              <h3 class="h6 fw-bold mb-1 ${t.estado === 'COMPLETADA' ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(t.titulo)}</h3>
              ${t.descripcion ? `<p class="small text-muted mb-2">${escapeHtml(t.descripcion)}</p>` : ''}
              ${tags ? `<div class="mb-2">${tags}</div>` : ''}
            </div>

            <div class="pt-2 mt-2">
              <div class="task-meta mb-2 ${isPast ? 'overdue-label' : ''}">
                Vence ${formatDateTime(t.fechaVencimiento)}
                ${isPast ? '<span class="badge badge-prioridad-CRITICA ms-1">VENCIDA</span>' : ''}
              </div>

              <!-- Selector de Transición de Estado (RN-02) -->
              <div class="card-actions">
                <select class="form-select form-select-sm" onchange="changeTaskStatus('${t.id}', this.value, '${t.estado}')">
                  <option value="" disabled selected>Cambiar estado...</option>
                  <option value="PENDIENTE" ${isTerminal ? 'disabled' : ''}>Pendiente</option>
                  <option value="EN_PROCESO" ${isTerminal ? 'disabled' : ''}>En Proceso</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
                <button class="btn btn-outline-danger btn-sm px-2" title="Eliminar tarea" aria-label="Eliminar tarea" onclick="deleteTask('${t.id}')">×</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Renderizar Compromisos
  function renderCommitments() {
    const statusFilter = filterCommitmentStatus.value;
    const filtered = commitmentsList.filter(c => {
      return statusFilter === 'TODOS' || c.estado === statusFilter;
    });

    if (filtered.length === 0) {
      commitmentsContainer.innerHTML = `
        <div class="text-center py-4 text-muted fst-italic">
          No hay compromisos programados.
        </div>`;
      return;
    }

    commitmentsContainer.innerHTML = filtered.map(c => {
      const isCancelled = c.estado === 'CANCELADO';
      const participants = (c.participantes || []).join(', ');

      return `
        <article class="timeline-item">
          <div class="timeline-card">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <span class="timeline-time">${formatDateTime(c.fechaInicio)} – ${formatDateTime(c.fechaFin)}</span>
              <div class="d-flex gap-2 align-items-center">
                <span class="badge badge-estado-${c.estado} rounded-pill px-2 py-1 small">${c.estado}</span>
              </div>
            </div>
            <h3 class="h6 mb-1 ${isCancelled ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(c.titulo)}</h3>
            ${c.descripcion ? `<p class="mb-2">${escapeHtml(c.descripcion)}</p>` : ''}
            <div class="d-flex flex-wrap gap-3 timeline-details">
              ${c.ubicacion ? `<span>${escapeHtml(c.ubicacion)}</span>` : ''}
              <span>Recordatorio: ${c.minutosRecordatorio} min</span>
              <span>Participantes: ${escapeHtml(participants)}</span>
            </div>
            <div class="d-flex gap-2 mt-3">
              ${!isCancelled ? `
                <button class="btn btn-outline-warning btn-sm flex-grow-1" onclick="cancelCommitment('${c.id}')">
                  Cancelar
                </button>
              ` : ''}
              <button class="btn btn-outline-danger btn-sm px-2" title="Eliminar compromiso" aria-label="Eliminar compromiso" onclick="deleteCommitment('${c.id}')">×</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Actualizar Métricas
  function updateMetrics() {
    metricTotalTasks.textContent = tasksList.length;
    const now = new Date();
    const overdue = tasksList.filter(t => (t.estado === 'PENDIENTE' || t.estado === 'EN_PROCESO') && new Date(t.fechaVencimiento) < now);
    metricOverdueTasks.textContent = overdue.length;
    const activeComm = commitmentsList.filter(c => c.estado === 'PROGRAMADO' || c.estado === 'CONFIRMADO');
    metricActiveCommitments.textContent = activeComm.length;
    const completed = tasksList.filter(t => t.estado === 'COMPLETADA');
    metricCompletedTasks.textContent = completed.length;
  }

  // Eventos de Filtro
  filterTaskStatus.addEventListener('change', renderTasks);
  filterTaskPriority.addEventListener('change', renderTasks);
  filterCommitmentStatus.addEventListener('change', renderCommitments);

  // Crear Tarea
  formNuevaTarea.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dto = {
      titulo: taskTitle.value,
      descripcion: taskDesc.value,
      fechaVencimiento: taskDueDate.value,
      prioridad: document.getElementById('taskPriority').value,
      estado: 'PENDIENTE',
      etiquetas: document.getElementById('taskTags').value.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      showToast('Tarea creada exitosamente.');
      formNuevaTarea.reset();
      taskTitleCounter.textContent = '0 / 100';
      taskDescCounter.textContent = '0 / 500';
      loadTasks();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // Crear Compromiso
  formNuevoCompromiso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const participantsList = document.getElementById('commParticipants').value.split(',').map(p => p.trim()).filter(Boolean);
    const dto = {
      titulo: commTitle.value,
      descripcion: document.getElementById('commDesc').value,
      fechaInicio: commStartDate.value,
      fechaFin: commEndDate.value,
      ubicacion: document.getElementById('commLocation').value,
      minutosRecordatorio: parseInt(document.getElementById('commReminder').value, 10),
      estado: document.getElementById('commStatus').value,
      participantes: participantsList,
      creadorEmail: participantsList[0] || ''
    };

    try {
      if (!checkCommitmentDuration() || !formNuevoCompromiso.reportValidity()) return;
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      showToast('Compromiso agendado correctamente.');
      formNuevoCompromiso.reset();
      commTitleCounter.textContent = '0 / 100';
      commEndDate.removeAttribute('min');
      commEndDate.setCustomValidity('');
      durationBadge.textContent = 'La fecha de fin debe ser posterior al inicio y durar al menos 15 minutos.';
      durationBadge.classList.remove('is-invalid', 'is-valid');
      loadCommitments();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // Funciones Globales para Acciones
  window.changeTaskStatus = async (id, newStatus, currentStatus) => {
    // Validación de transición RN-02
    if ((currentStatus === 'COMPLETADA' || currentStatus === 'CANCELADA') && (newStatus === 'PENDIENTE' || newStatus === 'EN_PROCESO')) {
      showToast(`RN-02: Una tarea ${currentStatus} no puede retroceder a ${newStatus}.`, true);
      renderTasks();
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      showToast(`Estado actualizado a ${newStatus}`);
      loadTasks();
    } catch (err) {
      showToast(err.message, true);
      loadTasks();
    }
  };

  window.deleteTask = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showToast('Tarea eliminada.');
      loadTasks();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  window.cancelCommitment = async (id) => {
    if (!confirm('¿Deseas cancelar este compromiso?')) return;
    try {
      const res = await fetch(`/api/commitments/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showToast('Compromiso cancelado.');
      loadCommitments();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  window.deleteCommitment = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este registro de compromiso?')) return;
    try {
      const res = await fetch(`/api/commitments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showToast('Compromiso eliminado.');
      loadCommitments();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatDateTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function toLocalDateTimeValue(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  // Carga inicial
  loadTasks();
  loadCommitments();
});
