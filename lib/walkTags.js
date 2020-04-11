const createWalker = require('./createWalker')
const catalog = new WeakMap()

const parseAttrs = (raw, input) => {
  const attrs = {}
  for (const attr of raw) {
    if (attr.value === true)
      attrs[attr.name] = true
    else if (attr.value[0].type === 'Text')
      attrs[attr.name] = attr.value[0].raw
    else if (attr.value[0].type === 'AttributeShorthand')
      attrs['{' + attr.name + '}'] = true
    else if (attr.value[0].type === 'MustacheTag')
      attrs[attr.name] = input.substring(attr.value[0].start, attr.value[0].end)
    else continue
  }
  return attrs
}

const makeElementNode = (node, input) => {
  if (node.type === 'Text') return node.raw
  if (catalog.has(node)) return catalog.get(node)

  const newTag = {
    name: node.name,
    attrs: parseAttrs(node.attributes, input),
  }
  newTag.children = node.children
    .map((tag) => {
      const res = makeElementNode(tag, input)
      if (typeof res !== 'string')
        res.parent = newTag
      return res
    })
  newTag.raw = input.substring(node.start, node.end)
  catalog.set(node, newTag)

  return newTag
}

const checkName = (match, {name}) => {
  if (!name) return false
  if (typeof match === 'string')
    return match === name ? true : false
  if(match.constructor.name === 'RegExp')
    return match.test(name) ? true : false
} 

const walkElements = createWalker(['Element', 'InlineComponent'], checkName, makeElementNode)

module.exports = walkElements