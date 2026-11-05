const assert = require('node:assert');
const taskService = require('../src/services/taskService');
const commitmentService = require('../src/services/commitmentService');
const { TaskValidationException, ScheduleConflictException } = require('../src/exceptions');

console.log('--- INICIANDO SUITE DE PRUEBAS DEL SDD (FASE DE PRUEBAS EN CASCADA) ---');

// Test RN-01
try {
  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
  taskService.createTask({
    titulo: 'Tarea Pasada Inválida',
    fechaVencimiento: pastDate
  });
  assert.fail('Debería haber fallado por RN-01');
} catch (e) {
  assert(e instanceof TaskValidationException);
  console.log('✓ RN-01 comprobada: Rechazo correcto de fecha en el pasado.');
}

// Test Creación Tarea Válida
const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const taskOk = taskService.createTask({
  titulo: 'Tarea Válida de Prueba',
  descripcion: 'Descripción de prueba',
  fechaVencimiento: futureDate,
  prioridad: 'ALTA',
  estado: 'PENDIENTE',
  etiquetas: ['Prueba', 'SDD']
});
assert.strictEqual(taskOk.titulo, 'Tarea Válida de Prueba');
console.log('✓ Creación de tarea válida completada:', taskOk.id);

// Test RN-02: Transición de estados
taskService.updateTaskStatus(taskOk.id, 'COMPLETADA');
try {
  taskService.updateTaskStatus(taskOk.id, 'PENDIENTE');
  assert.fail('Debería haber fallado por RN-02');
} catch (e) {
  assert(e instanceof TaskValidationException);
  console.log('✓ RN-02 comprobada: Rechazo de reversión desde COMPLETADA hacia PENDIENTE.');
}

// Test RN-04: Duración mínima 15 min
try {
  const start = new Date(Date.now() + 3600 * 1000);
  const endShort = new Date(start.getTime() + 10 * 60 * 1000); // solo 10 minutos
  commitmentService.scheduleCommitment({
    titulo: 'Reunión muy corta',
    fechaInicio: start.toISOString(),
    fechaFin: endShort.toISOString(),
    participantes: ['organizador@empresa.com']
  });
  assert.fail('Debería haber fallado por RN-04');
} catch (e) {
  assert(e instanceof TaskValidationException);
  console.log('✓ RN-04 comprobada: Rechazo de duración inferior a 15 minutos.');
}

// Test RN-05: Validación de formato de correos RFC 5322
try {
  const start = new Date(Date.now() + 3600 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  commitmentService.scheduleCommitment({
    titulo: 'Reunión correo malo',
    fechaInicio: start.toISOString(),
    fechaFin: end.toISOString(),
    participantes: ['correo-invalido-sin-arroba']
  });
  assert.fail('Debería haber fallado por RN-05');
} catch (e) {
  assert(e instanceof TaskValidationException);
  console.log('✓ RN-05 comprobada: Rechazo de correos no compatibles con RFC 5322.');
}

// Test Creación Compromiso Válido y RN-03 Solapamiento
const commStart = new Date(Date.now() + 2 * 3600 * 1000);
const commEnd = new Date(commStart.getTime() + 60 * 60 * 1000); // 1 hora
const commOk = commitmentService.scheduleCommitment({
  titulo: 'Comité de Arquitectura',
  fechaInicio: commStart.toISOString(),
  fechaFin: commEnd.toISOString(),
  participantes: ['arquitecto@empresa.com', 'lider@empresa.com'],
  creadorEmail: 'arquitecto@empresa.com'
});
console.log('✓ Creación de compromiso válido:', commOk.id);

// Test RN-03: Solapamiento exacto o parcial
try {
  const overlapStart = new Date(commStart.getTime() + 15 * 60 * 1000); // empieza 15 min después
  const overlapEnd = new Date(commEnd.getTime() + 30 * 60 * 1000);
  commitmentService.scheduleCommitment({
    titulo: 'Compromiso en conflicto',
    fechaInicio: overlapStart.toISOString(),
    fechaFin: overlapEnd.toISOString(),
    participantes: ['arquitecto@empresa.com'],
    creadorEmail: 'arquitecto@empresa.com'
  });
  assert.fail('Debería haber fallado por RN-03');
} catch (e) {
  assert(e instanceof ScheduleConflictException);
  console.log('✓ RN-03 comprobada: Detección y bloqueo de solapamiento de horarios (ScheduleConflictException).');
}

console.log('--- TODAS LAS PRUEBAS DE REGLAS DE NEGOCIO PASARON SATISFACTORIAMENTE ---');
