const commandValidator = require('./CommandValidator');
const commandPropertyValidator = require('./CommandPropertyValidator');
const whenPropertyValidator = require('./WhenPropertyValidator');
const whenIndentationValidator = require('./WhenIndentationValidator');
const nestedObjectValidator = require('./NestedObjectValidator');
const arrayCommandValidator = require('./ArrayCommandValidator');
const filePathValidator = require('./FilePathValidator');
const headerValidator = require('./HeaderValidator');

module.exports = {
  commandValidator,
  commandPropertyValidator,
  whenPropertyValidator,
  whenIndentationValidator,
  nestedObjectValidator,
  arrayCommandValidator,
  filePathValidator,
  headerValidator
};
