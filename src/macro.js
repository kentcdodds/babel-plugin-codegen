// const printAST = require('ast-pretty-print')
const {createMacro} = require('babel-plugin-macros')
const {asIdentifier} = require('./replace')

module.exports = createMacro(codegenMacros)

function codegenMacros({references, state}) {
  const filename = state.file.opts.filename
  references.default.forEach(referencePath => {
    if (asIdentifier(referencePath, filename) === false) {
      // TODO: throw a helpful error message
      // the macro was not used properly
    }
  })
}
