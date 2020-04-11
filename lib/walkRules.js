const createWalker = require('./createWalker')
const catalog = new WeakMap()

const makeRuleNode = (node, input) => {
  if (catalog.has(node)) return catalog.get.node()
  const rule = {}
  catalog.set(node, rule)
  rule.selector = node.selector.children.map((sel) => input.substring(sel.start, sel.end))
  rule.raw = input.substring(node.start, node.end)
  return rule
}

const checkBySelector = (match, {selector}) => {
  if (!selector) return false
  if (typeof match === 'string')
    return selector.indexOf(match) !== -1
  if(match.constructor.name === 'RegExp')
    return selector.some((sel) => match.test(sel))
}

const walkRules = createWalker(['Rule'], checkBySelector, makeRuleNode)
module.exports = walkRules