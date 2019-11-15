import path from 'path'
import pluginTester from 'babel-plugin-tester'
import plugin from '../'

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
  babelOptions: {filename: __filename},
  tests: {
    'does not touch non-codegen code': {
      snapshot: false,
      code: `const x = notCodegen\`module.exports = 'nothing'\``,
    },
    'basic value': 'const x = codegen`module.exports = "1"`',
    'simple variable assignment':
      'codegen`module.exports = "var x = \'some directive\'"`',
    'object with arrow function': `
      const y = codegen\`
        module.exports = '({booyah: () => "booyah"})'
      \`
    `,
    'must export a string': {
      code: 'const y = codegen`module.exports = {}`',
      error: true,
    },
    'codegen comment': `
      // @codegen
      const array = ['apple', 'orange', 'pear']
      module.exports = array
        .map(fruit => \`export const \${fruit} = "\${fruit}";\`)
        .join('')
    `,
    'dynamic value that is wrong': {
      code: `const x = codegen\`module.exports = "\${dynamic}"\``,
      error: true,
    },
    'import comment': 'import /* codegen */ "./fixtures/assign-one.js"',
    'import comment with extra comments after':
      'import /* codegen */ /* this is extra stuff */ "./fixtures/assign-one.js"',
    'import comment with extra comments before':
      'import /* this is extra stuff */ /* codegen */ "./fixtures/assign-one.js"',
    'does not touch import comments that are irrelevant': {
      code: `import /* this is extra stuff */'./fixtures/assign-one.js'`,
      // babel does weird things to comments like these
      output: `
        import /* this is extra stuff */
        './fixtures/assign-one.js'
      `,
      snapshot: false,
    },
    'import comment with number argument':
      'import /* codegen(3) */ "./fixtures/assign-identity"',
    'import comment with string argument':
      'import /* codegen("string") */ "./fixtures/assign-identity"',
    'import comment with object argument':
      'import /* codegen(({object: "argument"})) */ "./fixtures/assign-identity"',
    'import comment with required argument':
      'import /* codegen(Number(require("./fixtures/return-one"))) */ "./fixtures/assign-identity"',
    'simple require': 'const x = codegen.require("./fixtures/return-one")',
    'require with argument':
      'const x = codegen.require("./fixtures/identity", 3)',
    'require with unknown argument value': {
      code:
        'const x = codegen.require("./fixtures/identity", SOME_UNKNOWN_VARIABLE)',
      error: true,
    },
    'require with argument for non-function module': {
      code:
        'const x = codegen.require("./fixtures/return-one", "should not be here...")',
      error: true,
    },
    'does not touch codegen identifiers that are irrelevant': {
      code: 'const x = not.codegen()',
      snapshot: false,
    },
    'does not touch codegen comment without extra code': {
      snapshot: false,
      code: '// @codegen',
    },
    'does not touch codegen comment with comments but no code': {
      snapshot: false,
      code: `
        // @codegen

        /* comment */
      `,
    },
    'can consume transpiled esmodules (uses default)': `import x from /* codegen(3) */ "./fixtures/es6-identity"`,
    // I can't remember why we have these tests...
    'extra test':
      // eslint-disable-next-line
      'codegen`module.exports = ["one", "two"].map((x, i) => \\`var \\${x} = "\\${i + 1}";\\`).join("\\\\n")`',
    'extra test 2': 'codegen`module.exports = "var ALLCAPS = \'ALLCAPS\'"`',
  },
})

// This is for any of the exta tests. We give these a name.
pluginTester({
  plugin,
  snapshot: true,
  babelOptions: {filename: __filename},
  tests: {
    'handles some dynamic values': `
      const three = 3
      const x = codegen\`module.exports = "\${three}"\`
    `,
    'removes the node if nothing is returned': `
      codegen\`module.exports = ''\`
    `,
    'removes the node if nothing is returned in require': `
      codegen.require('./fixtures/nothing-exported')
    `,
    'handles multipe nodes': `
      codegen.require('./fixtures/multiple-nodes')
    `,
    'includes code comments': `
      codegen\`
        module.exports = \\\`
          // before
          var x = 'hi'
          /*
           * after
           */

          // call foo
          console.log(foo())

           /**
            * jsdoc
            * @return {string} cool I guess
            */
           function foo() {
             return 'foo'
           }
        \\\`
      \`
    `,
    'accepts babels parser options for generated code': {
      babelOptions: {
        filename: __filename,
        parserOpts: {plugins: ['flow', 'doExpressions']},
      },
      code: `
        // @codegen
        module.exports = "var fNum: number = do { if(true) {100} else {200} };"
      `,
    },
  },
})
