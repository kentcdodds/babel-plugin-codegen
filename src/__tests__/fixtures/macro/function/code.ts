import codegen from '../../../helpers/codegen.macro'

const x: {booyah(): string} = codegen`
  module.exports = "({booyah() { return 'booyah!'; } })"
`
console.log(x.booyah())
