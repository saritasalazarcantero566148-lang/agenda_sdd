const crypto = require('node:crypto');
const db = require('../db');
const { TaskValidationException } = require('../exceptions');

const VALID_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const VALID_STATUSES = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'];

class TaskService {
  /**
   * RN-01: Validación de Fechas de Tareas
   * RN-02: Transición de Estados
   */
  createTask(dto) {
    if (!dto.titulo || typeof dto.titulo !== 'string' || dto.titulo.trim().length === 0) {
      throw new TaskValidationException('El título de la tarea es requerido.');
    }
    if (dto.titulo.trim().length > 100) {
      throw new TaskValidationException('El título excede el límite de 100 caracteres.');
    }
    if (dto.descripcion && dto.descripcion.length > 500) {
      throw new TaskValidationException('La descripción excede el límite de 500 caracteres.');
    }
    if (!dto.fechaVencimiento) {
      throw new TaskValidationException('La fecha de vencimiento es requerida.');
    }

    const dueDate = new Date(dto.fechaVencimiento);
    if (isNaN(dueDate.getTime())) {
      throw new TaskValidationException('Formato de fecha de vencimiento inválido.');
    }

    const now = new Date();
    // RN-01: No se puede crear con fechaVencimiento en el pasado
    if (dueDate < now) {
      throw new TaskValidationException('RN-01: No se puede crear una tarea con fecha de vencimiento en el pasado.');
    }

    const prioridad = dto.prioridad ? dto.prioridad.toUpperCase() : 'MEDIA';
    if (!VALID_PRIORITIES.includes(prioridad)) {
      throw new TaskValidationException(`Prioridad inválida. Opciones: ${VALID_PRIORITIES.join(', ')}`);
    }

    const estado = dto.estado ? dto.estado.toUpperCase() : 'PENDIENTE';
    if (!VALID_STATUSES.includes(estado)) {
      throw new TaskValidationException(`Estado inválido. Opciones: ${VALID_STATUSES.join(', ')}`);
    }

    const etiquetas = Array.isArray(dto.etiquetas)
      ? dto.etiquetas.map(e => String(e).trim()).filter(Boolean)
      : [];

    const id = crypto.randomUUID();
    const createdAt = now.toISOString();
    const etiquetasJson = JSON.stringify(etiquetas);

    const stmt = db.prepare(`
      INSERT INTO tasks (id, titulo, descripcion, fechaVencimiento, prioridad, estado, etiquetas, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.titulo.trim(),
      dto.descripcion ? dto.descripcion.trim() : null,
      dueDate.toISOString(),
      prioridad,
      estado,
      etiquetasJson,
      createdAt
    );

    return this.getTaskById(id);
  }

  updateTaskStatus(id, newStatus) {
    if (!newStatus || !VALID_STATUSES.includes(newStatus.toUpperCase())) {
      throw new TaskValidationException(`Estado inválido. Opciones válidas: ${VALID_STATUSES.join(', ')}`);
    }

    const currentTask = this.getTaskById(id);
    if (!currentTask) {
      throw new TaskValidationException(`Tarea no encontrada con ID: ${id}`);
    }

    const upperStatus = newStatus.toUpperCase();

    // RN-02: Una tarea COMPLETADA o CANCELADA no puede cambiar a EN_PROCESO o PENDIENTE
    const terminalStates = ['COMPLETADA', 'CANCELADA'];
    const backwardStates = ['EN_PROCESO', 'PENDIENTE'];

    if (terminalStates.includes(currentTask.estado) && backwardStates.includes(upperStatus)) {
      throw new TaskValidationException(
        `RN-02: Una tarea en estado '${currentTask.estado}' no puede retroceder a '${upperStatus}'.`
      );
    }

    const stmt = db.prepare('UPDATE tasks SET estado = ? WHERE id = ?');
    stmt.run(upperStatus, id);

    return this.getTaskById(id);
  }

  getPendingTasksOverdue(nowInput) {
    const referenceDate = nowInput ? new Date(nowInput) : new Date();
    const all = this.getAllTasks();
    return all.filter(t => {
      const isPending = t.estado === 'PENDIENTE' || t.estado === 'EN_PROCESO';
      const isPast = new Date(t.fechaVencimiento) < referenceDate;
      return isPending && isPast;
    });
  }

  getAllTasks() {
    const stmt = db.prepare('SELECT * FROM tasks ORDER BY fechaVencimiento ASC');
    const rows = stmt.all();
    return rows.map(r => ({
      ...r,
      etiquetas: r.etiquetas ? JSON.parse(r.etiquetas) : []
    }));
  }

  getTaskById(id) {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      etiquetas: row.etiquetas ? JSON.parse(row.etiquetas) : []
    };
  }

  deleteTask(id) {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
}

module.exports = new TaskService();
