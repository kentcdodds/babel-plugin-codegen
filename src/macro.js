// const printAST = require('ast-pretty-print')
const {createMacro} = require('babel-plugin-macros')
const getReplacers = require('./replace')

module.exports = createMacro(codegenMacros)

function codegenMacros({references, state, babel}) {
  const {asIdentifier} = getReplacers(babel)
  const fileOpts = state.file.opts
  references.default.forEach(referencePath => {
    if (asIdentifier(referencePath, fileOpts) === false) {
      throw referencePath.buildCodeFrameError(
        'codegen macro must be used as a tagged template literal, function, jsx, or .require call',
        Error,
      )
    }
  })
}
