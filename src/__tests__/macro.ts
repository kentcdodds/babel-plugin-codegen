import path from 'path'
import pluginTester from 'babel-plugin-tester'
import stripAnsi from 'strip-ansi'
import plugin from 'babel-plugin-macros'

const projectRoot = path.join(__dirname, '../../')

expect.addSnapshotSerializer({
  print(val) {
    return stripAnsi(val as string)
      .split(projectRoot)
      .join('<PROJECT_ROOT>/')
  },
  test(val) {
    return typeof val === 'string'
  },
})

// the fixtures is handy because we can also test the type defs at the same time
pluginTester({
  plugin,
  pluginName: 'codegen/macro',
  snapshot: true,
  babelOptions: {filename: __filename, presets: ['@babel/preset-typescript']},
  fixtures: path.join(__dirname, './fixtures/macro'),
})

pluginTester({
  plugin,
  pluginName: 'codegen/macro',
  snapshot: true,
  babelOptions: {filename: __filename, parserOpts: {plugins: ['jsx']}},
  tests: {
    // couldn't figure out how to do type defs for JSX 😬
    // (got an error about not being able to create an overload... I guess it can't be all the things?)
    // PRs welcome
    'as jsx': `
      const Codegen = require('./helpers/codegen.macro')
      const ui = (
        <Codegen>{"module.exports = '<div>Hi</div>'"}</Codegen>
      )
    `,
    'as jsx with tag': `
      const Codegen = require('./helpers/codegen.macro')
      const ui = (
        <Codegen>{\`module.exports = '<div>Hello</div>'\`}</Codegen>
      )
    `,
    'with multiple': `
      import codegen from './helpers/codegen.macro'

      codegen\`module.exports = ['a', 'b', 'c'].map(l => 'export const ' + l + ' = ' + JSON.stringify(l)).join(';')\`
    `,
    'with a single export declaration': `
      import codegen from './helpers/codegen.macro'

      codegen\`module.exports = "export const a = 'a'"\`
    `,
    'with a single import declaration': `
      import codegen from './helpers/codegen.macro'

      codegen\`module.exports = "import a from 'a'"\`
    `,
    'invalid usage: as fn argument': {
      code: `
        import codegen from './helpers/codegen.macro';
        var x = doSomething(codegen);
      `,
      error: true,
    },
    'invalid usage: missing code string': {
      code: `
        import codegen from './helpers/codegen.macro';
        var x = codegen;
      `,
      error: true,
    },
  },
})
