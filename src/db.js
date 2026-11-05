const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'agenda.sqlite');
const db = new DatabaseSync(dbPath);

// Inicializar tablas según modelo de dominio del SDD
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fechaVencimiento TEXT NOT NULL,
    prioridad TEXT NOT NULL,
    estado TEXT NOT NULL,
    etiquetas TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS commitments (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL,
    ubicacion TEXT,
    participantes TEXT NOT NULL,
    estado TEXT NOT NULL,
    minutosRecordatorio INTEGER DEFAULT 15,
    creadorEmail TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

module.exports = db;
