module.exports = (...args) =>
  `var sumArgsPlus2 = ${args.reduce((s, n) => s + n, 2)}`
