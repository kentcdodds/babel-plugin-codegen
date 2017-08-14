import path from 'path'
import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-macros'

const projectRoot = path.join(__dirname, '../../')

expect.addSnapshotSerializer({
  print(val) {
    return val.split(projectRoot).join('<PROJECT_ROOT>/')
  },
  test(val) {
    return typeof val === 'string'
  },
})

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: {filename: __filename, parserOpts: {plugins: ['jsx']}},
  tests: {
    'as tag': `
      import codegen from '../macro'
      const greeting = 'Hello world!'
      codegen\`module.exports = "module.exports = '\${greeting}';"\`
    `,
    'as function': `
      const myCodgen = require('../macro')
      myCodgen(\`
        module.exports = "var x = {booyah() { return 'booyah!'; } };"
      \`)
    `,
    'as jsx': `
      const Codegen = require('../macro')
      const ui = (
        <Codegen>{"module.exports = '<div>Hi</div>'"}</Codegen>
      )
    `,
    'as jsx with tag': `
      const Codegen = require('../macro')
      const ui = (
        <Codegen>{\`module.exports = '<div>Hi</div>'\`}</Codegen>
      )
    `,
    'with multiple': `
      import codegen from '../macro'

      codegen\`module.exports = ['a', 'b', 'c'].map(l => 'export const ' + l + ' = ' + JSON.stringify(l)).join(';')\`
    `,
  },
})
