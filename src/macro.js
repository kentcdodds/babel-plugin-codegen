// const printAST = require('ast-pretty-print')
const {createMacro} = require('babel-plugin-macros')
const {asIdentifier} = require('./replace')

module.exports = createMacro(codegenMacros)

function codegenMacros({references, state}) {
  const filename = state.file.opts.filename
  references.default.forEach(referencePath => {
    if (asIdentifier(referencePath, filename) === false) {
      throw referencePath.buildCodeFrameError(
        'codegen macro must be used as a tagged template literal, function, jsx, or .require call',
        Error,
      )
    }
  })
}
