const crypto = require('node:crypto');
const db = require('../db');
const { TaskValidationException, ScheduleConflictException } = require('../exceptions');

const VALID_STATUSES = ['PROGRAMADO', 'CONFIRMADO', 'CANCELADO'];

// Expresión regular RFC 5322 estándar para emails
const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

class CommitmentService {
  /**
   * RN-03: No solapamiento de compromisos
   * RN-04: Duración mínima 15 min
   * RN-05: Validación RFC 5322 de participantes
   */
  scheduleCommitment(dto) {
    if (!dto.titulo || typeof dto.titulo !== 'string' || dto.titulo.trim().length === 0) {
      throw new TaskValidationException('El título del compromiso es requerido.');
    }
    if (dto.titulo.trim().length > 100) {
      throw new TaskValidationException('El título excede el límite de 100 caracteres.');
    }

    if (!dto.fechaInicio || !dto.fechaFin) {
      throw new TaskValidationException('Se requieren fecha de inicio y fecha de fin.');
    }

    const start = new Date(dto.fechaInicio);
    const end = new Date(dto.fechaFin);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new TaskValidationException('Formato de fecha inválido.');
    }

    // RN-04: fechaFin > fechaInicio y duración mínima >= 15 minutos
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (diffMinutes < 15) {
      throw new TaskValidationException(
        `RN-04: La duración del compromiso debe ser de al menos 15 minutos y la fecha de fin debe ser posterior a la de inicio. (Duración actual: ${diffMinutes.toFixed(1)} min)`
      );
    }

    // RN-05: Validación de participantes RFC 5322
    let participantes = [];
    if (Array.isArray(dto.participantes)) {
      participantes = dto.participantes.map(p => String(p).trim()).filter(Boolean);
    } else if (typeof dto.participantes === 'string') {
      participantes = dto.participantes.split(',').map(p => p.trim()).filter(Boolean);
    }

    if (participantes.length === 0) {
      throw new TaskValidationException('RN-05: Se requiere al menos un participante (el creador).');
    }

    for (const email of participantes) {
      if (!RFC5322_EMAIL_REGEX.test(email)) {
        throw new TaskValidationException(`RN-05: El correo participante '${email}' no cumple con el formato estándar RFC 5322.`);
      }
    }

    const creadorEmail = dto.creadorEmail ? dto.creadorEmail.trim().toLowerCase() : participantes[0].toLowerCase();

    // RN-03: Detección de solapamiento
    if (this.hasScheduleConflict(creadorEmail, start, end)) {
      throw new ScheduleConflictException(
        `RN-03: Conflicto de horario detectado. Ya existe un compromiso activo (PROGRAMADO o CONFIRMADO) para '${creadorEmail}' en ese intervalo.`
      );
    }

    const estado = dto.estado ? dto.estado.toUpperCase() : 'PROGRAMADO';
    if (!VALID_STATUSES.includes(estado)) {
      throw new TaskValidationException(`Estado inválido. Opciones: ${VALID_STATUSES.join(', ')}`);
    }

    const minutosRecordatorio = typeof dto.minutosRecordatorio === 'number' && dto.minutosRecordatorio >= 0
      ? dto.minutosRecordatorio
      : 15;

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO commitments (
        id, titulo, descripcion, fechaInicio, fechaFin, ubicacion, participantes, estado, minutosRecordatorio, creadorEmail, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.titulo.trim(),
      dto.descripcion ? dto.descripcion.trim() : null,
      start.toISOString(),
      end.toISOString(),
      dto.ubicacion ? dto.ubicacion.trim() : null,
      JSON.stringify(participantes),
      estado,
      minutosRecordatorio,
      creadorEmail,
      createdAt
    );

    return this.getCommitmentById(id);
  }

  cancelCommitment(id) {
    const existing = this.getCommitmentById(id);
    if (!existing) {
      throw new TaskValidationException(`Compromiso no encontrado con ID: ${id}`);
    }

    const stmt = db.prepare("UPDATE commitments SET estado = 'CANCELADO' WHERE id = ?");
    stmt.run(id);
  }

  hasScheduleConflict(creadorEmail, start, end, excludeId = null) {
    const stmt = db.prepare(`
      SELECT * FROM commitments 
      WHERE creadorEmail = ? 
        AND estado IN ('PROGRAMADO', 'CONFIRMADO')
    `);
    const rows = stmt.all(creadorEmail.toLowerCase());

    const newStart = new Date(start).getTime();
    const newEnd = new Date(end).getTime();

    // Rango de traslape: (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)
    return rows.some(comm => {
      if (excludeId && comm.id === excludeId) return false;
      const existStart = new Date(comm.fechaInicio).getTime();
      const existEnd = new Date(comm.fechaFin).getTime();
      return (newStart < existEnd) && (newEnd > existStart);
    });
  }

  getAllCommitments() {
    const stmt = db.prepare('SELECT * FROM commitments ORDER BY fechaInicio ASC');
    const rows = stmt.all();
    return rows.map(r => ({
      ...r,
      participantes: r.participantes ? JSON.parse(r.participantes) : []
    }));
  }

  getCommitmentById(id) {
    const stmt = db.prepare('SELECT * FROM commitments WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      participantes: row.participantes ? JSON.parse(row.participantes) : []
    };
  }

  deleteCommitment(id) {
    const stmt = db.prepare('DELETE FROM commitments WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
}

module.exports = new CommitmentService();
