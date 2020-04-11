const svelte = require('svelte/compiler')


const createCatalog = (ast) => {
  const catalog = new Map()
  svelte.walk(ast, {
    enter(node, parent, prop, index) {
      if (!node.type) return
      if (!catalog.has(node.type))
        catalog.set(node.type, new Set())
      catalog.get(node.type).add(node)
    }
  })
  return catalog
}

const processor = (input) => {
  const ast = svelte.parse(input)
  let html, css, instance, module

  return {
    html() {
      if (!html) html = createCatalog(ast.html)
      return {
        walkTags: require('./walkTags')(html, input)
      }
    },
    css() {
      if (!css) css = createCatalog(ast.css)
      return {
        walkRules: require('./walkRules')(css, input)
      }
    },
    instance() {
      if (!instance) instance = createCatalog(ast.instance)
      return {}
    },
    module() {
      if (!module) module = createCatalog(ast.module)
      return {}
    }
  }

}

module.exports = processor