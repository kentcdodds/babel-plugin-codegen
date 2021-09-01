import p from 'path'
import fs from 'fs'
import type babelCore from '@babel/core'
import type {Primitive} from 'type-fest'
import requireFromCodeString from 'require-from-string'

type CodegenModuleExport = string | ((...args: Array<any>) => string)

type CompiledESModule = {
  __esModule: boolean
  default: CodegenModuleExport
}

// istanbul ignore next because I don't know how to reproduce a situation
// where the filename doesn't exist, but TypeScript gets mad when I don't handle that case.
const getFilename = (fileOpts: babelCore.TransformOptions): string =>
  fileOpts.filename ?? '"unknown"'

function requireFromString(code: string | Buffer, filename: string) {
  // Execute the transformed code, as if it were required
  const module = requireFromCodeString(String(code), filename) as
    | CompiledESModule
    | CodegenModuleExport
  if (typeof module === 'string' || typeof module === 'function') {
    return module
  } else {
    // Allow for es modules (default export)
    return module.__esModule ? module.default : module
  }
}

type GetReplacementOptions = {
  code: string | Buffer
  fileOpts: babelCore.TransformOptions
  args?: Array<any>
}
function getReplacement(
  {code, fileOpts, args = []}: GetReplacementOptions,
  babel: typeof babelCore,
) {
  const filename = getFilename(fileOpts)

  let module = requireFromString(code, filename)

  // If a function is epxorted, call it with args
  if (typeof module === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    module = module(...args)
  } else if (args.length) {
    throw new Error(
      `codegen module (${p.relative(
        process.cwd(),
        filename,
      )}) cannot accept arguments because it does not export a function (it exports a ${typeof module}). You passed the arguments: ${args.join(
        ', ',
      )}`,
    )
  }

  // Convert whatever we got now (hopefully a string) into AST form
  if (typeof module !== 'string') {
    throw new Error('codegen: Must module.exports a string.')
  }
  return babel.template(module, {
    preserveComments: true,
    placeholderPattern: false,
    ...fileOpts.parserOpts,
    sourceType: 'module',
  })()
}

function applyReplacementToPath<SpecificNode extends babelCore.types.Node>(
  replacement: babelCore.Node | Array<babelCore.Node> | null | undefined,
  path: babelCore.NodePath<SpecificNode>,
) {
  if (replacement) {
    // If it's not an array, wrap into an array
    // to support single import/export declarations:
    // https://github.com/kentcdodds/babel-plugin-codegen/issues/30
    path.replaceWithMultiple(
      Array.isArray(replacement) ? replacement : [replacement],
    )
  } else {
    path.remove()
  }
}

type ReplaceOptions<SpecificNode extends babelCore.types.Node> = {
  path: babelCore.NodePath<SpecificNode>
  code: string | Buffer
  fileOpts: babelCore.TransformOptions
  args?: Array<any>
}
function replace<SpecificNode extends babelCore.types.Node>(
  {path, code, fileOpts, args}: ReplaceOptions<SpecificNode>,
  babel: typeof babelCore,
) {
  const replacement = getReplacement({code, args, fileOpts}, babel)
  applyReplacementToPath(replacement, path)
}

function resolveModuleContents({
  filename,
  module,
}: {
  filename: string
  module: string
}) {
  const resolvedPath = p.resolve(p.dirname(filename), module)
  const code = fs.readFileSync(require.resolve(resolvedPath))
  return {code, resolvedPath}
}

function isCodegenComment(comment: babelCore.types.Comment) {
  const normalisedComment = comment.value.trim().split(' ')[0].trim()
  return (
    normalisedComment.startsWith('codegen') ||
    normalisedComment.startsWith('@codegen')
  )
}

function isPropertyCall(path: babelCore.NodePath, name: string) {
  return looksLike(path, {
    node: {
      type: 'CallExpression',
      callee: {
        property: {name},
      },
    },
  })
}

// really difficult (impossible?) to make this work with explicit types
// but if I could, I would make it this:
// type LooksLikeTarget = Primitive | Function | {[key: string]: LooksLikeTarget}
type LooksLikeTarget = any

type LooksLikeMatch =
  | Primitive
  | ((a: LooksLikeTarget) => boolean)
  | {[key: string]: LooksLikeMatch}

function looksLike(a: LooksLikeTarget, b: LooksLikeMatch): boolean {
  if (isPrimitive(b)) return a === b
  if (typeof b === 'function') return b(a)

  // istanbul ignore next because we don't have this use case
  // but if anyone copy/pastes this handy utility, they might need it!
  if (isPrimitive(a) || typeof a === 'function') return false

  return Object.keys(b).every(bKey => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return looksLike(a[bKey], b[bKey])
  })
}

function isPrimitive(val: unknown): val is Primitive {
  // eslint-disable-next-line
  return val == null || /^[sbn]/.test(typeof val)
}

export {
  requireFromString,
  getReplacement,
  replace,
  resolveModuleContents,
  isCodegenComment,
  isPropertyCall,
  looksLike,
  getFilename,
}

/*
eslint
  @typescript-eslint/no-explicit-any: "off",
  complexity: ["error", 8],
  import/no-unassigned-import: "off",
  import/no-dynamic-require: "off",
*/
