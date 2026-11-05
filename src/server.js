const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const taskService = require('./services/taskService');
const commitmentService = require('./services/commitmentService');
const { TaskValidationException, ScheduleConflictException } = require('./exceptions');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types para archivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB max
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON malformado'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Manejo de CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // --- RUTAS DE TAREAS ---
    if (pathname === '/api/tasks' && req.method === 'GET') {
      const tasks = taskService.getAllTasks();
      return sendJson(res, 200, { success: true, data: tasks });
    }

    if (pathname === '/api/tasks' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const task = taskService.createTask(body);
      return sendJson(res, 201, { success: true, data: task });
    }

    if (pathname === '/api/tasks/overdue' && req.method === 'GET') {
      const nowParam = parsedUrl.searchParams.get('now');
      const overdue = taskService.getPendingTasksOverdue(nowParam);
      return sendJson(res, 200, { success: true, data: overdue });
    }

    const taskStatusMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/status$/);
    if (taskStatusMatch && req.method === 'PATCH') {
      const taskId = taskStatusMatch[1];
      const body = await parseJsonBody(req);
      const updated = taskService.updateTaskStatus(taskId, body.estado);
      return sendJson(res, 200, { success: true, data: updated });
    }

    const taskDeleteMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)$/);
    if (taskDeleteMatch && req.method === 'DELETE') {
      const taskId = taskDeleteMatch[1];
      taskService.deleteTask(taskId);
      return sendJson(res, 200, { success: true, message: 'Tarea eliminada' });
    }

    // --- RUTAS DE COMPROMISOS ---
    if (pathname === '/api/commitments' && req.method === 'GET') {
      const commitments = commitmentService.getAllCommitments();
      return sendJson(res, 200, { success: true, data: commitments });
    }

    if (pathname === '/api/commitments' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const commitment = commitmentService.scheduleCommitment(body);
      return sendJson(res, 201, { success: true, data: commitment });
    }

    if (pathname === '/api/commitments/check-conflict' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const hasConflict = commitmentService.hasScheduleConflict(
        body.creadorEmail,
        body.fechaInicio,
        body.fechaFin
      );
      return sendJson(res, 200, { success: true, hasConflict });
    }

    const commCancelMatch = pathname.match(/^\/api\/commitments\/([a-zA-Z0-9-]+)\/cancel$/);
    if (commCancelMatch && req.method === 'POST') {
      const commId = commCancelMatch[1];
      commitmentService.cancelCommitment(commId);
      return sendJson(res, 200, { success: true, message: 'Compromiso cancelado' });
    }

    const commDeleteMatch = pathname.match(/^\/api\/commitments\/([a-zA-Z0-9-]+)$/);
    if (commDeleteMatch && req.method === 'DELETE') {
      const commId = commDeleteMatch[1];
      commitmentService.deleteCommitment(commId);
      return sendJson(res, 200, { success: true, message: 'Compromiso eliminado' });
    }

    // --- SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND) ---
    let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    let safePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

    if (!safePath.startsWith(PUBLIC_DIR)) {
      return sendJson(res, 403, { error: 'Acceso prohibido' });
    }

    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(safePath).pipe(res);
      return;
    }

    // Si no es API ni archivo estático
    sendJson(res, 404, { error: 'Ruta no encontrada' });

  } catch (error) {
    if (error instanceof TaskValidationException) {
      return sendJson(res, 400, { error: error.name, message: error.message });
    }
    if (error instanceof ScheduleConflictException) {
      return sendJson(res, 409, { error: error.name, message: error.message });
    }
    console.error('Error no controlado:', error);
    sendJson(res, 500, { error: 'InternalServerError', message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor de Agenda de Tareas ejecutándose en http://localhost:${PORT}`);
});

module.exports = server;
