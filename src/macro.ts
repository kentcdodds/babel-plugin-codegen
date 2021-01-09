// import printAST from 'ast-pretty-print'
import type babelCore from '@babel/core'
import {createMacro} from 'babel-plugin-macros'
import type {MacroHandler} from 'babel-plugin-macros'
import {getReplacers} from './replace'

const codegenMacros: MacroHandler = function codegenMacros({
  references,
  state,
  babel,
}) {
  const {asIdentifier} = getReplacers(babel)
  const fileOpts = state.file.opts
  references.default.forEach(referencePath => {
    if (
      asIdentifier(
        referencePath as babelCore.NodePath<babelCore.types.Identifier>,
        fileOpts,
      ) === false
    ) {
      throw referencePath.buildCodeFrameError(
        'codegen macro must be used as a tagged template literal, function, jsx, or .require call',
        Error,
      )
    }
  })
}

export default createMacro(codegenMacros) as MacroHandler
