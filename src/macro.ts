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

declare function codegen(
  literals: TemplateStringsArray,
  ...interpolations: Array<unknown>
): any

declare function codegen(code: string): any
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace codegen {
  function require(modulePath: string, ...args: Array<unknown>): any
}
// Unfortunately I couldn't figure out how to add TS support for the JSX form
// Something about the overload not being supported because codegen can't be all the things or whatever

export default createMacro(codegenMacros) as typeof codegen

/*
eslint
  @typescript-eslint/no-explicit-any: "off",
*/
