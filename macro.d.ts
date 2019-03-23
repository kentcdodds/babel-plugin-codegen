/**
 * 💥 Generate code at build-time
 *
 * @param template A well-formed template string of code.
 * @param substitutions A set of substitution values.
 *
 * ---
 *
 * @example
 *
 * ```ts
 * import codegen from 'babel-plugin-codegen/macro'
 * const three = 3
 * const x = codegen`module.exports = '12${three}'`
 *
 *        ↓ ↓ ↓ ↓ ↓ ↓
 *
 * const three = 3
 * const x = 123
 * ```
 */

declare const codegen: <T = any>(
  template: TemplateStringsArray,
  ...substitutions: any[]
) => T

export default codegen
