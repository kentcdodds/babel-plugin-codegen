import codegen from '../../../helpers/codegen.macro'

const greeting = 'Hello world!'
codegen`module.exports = "module.exports = '${greeting}';"`
