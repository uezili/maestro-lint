class ValidationError {
  constructor(message, lineNumber = null, commandName = null) {
    this.message = message;
    this.lineNumber = lineNumber;
    this.commandName = commandName;
  }

  toString() {
    if (this.lineNumber) {
      return `Linha ${this.lineNumber}: ${this.message}`;
    }
    return this.message;
  }

  toArray() {
    return [this.toString()];
  }
}

module.exports = ValidationError;
