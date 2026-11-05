class TaskValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = 'TaskValidationException';
    this.status = 400;
  }
}

class ScheduleConflictException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScheduleConflictException';
    this.status = 409;
  }
}

module.exports = {
  TaskValidationException,
  ScheduleConflictException
};
