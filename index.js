const svelte = require('svelte/compiler')


/**
 * Create catalog of nodes from AST by types
 * 
 * @param {Object} ast AST for catologize
 * @return {Object} Has 2 methods: walk and skip
 * walk - walking any category from catalog. Get 2 args
 *  - Type of node
 *  - handler, has 1 arg - node
 * skip - skip walking if argument is true (default - true)
 */
const createCatalogWalker = (ast) => {
  const catalog = new Map()
  // fill catalog
  svelte.walk(ast, {
    enter(node) {
      if (!node.type) return
      if (!catalog.has(node.type))
        catalog.set(node.type, new Set())
      catalog.get(node.type).add(node)
    }
  })

  // checker for stop walking
  let skip = false
  return {
    /**
     * Calling in walker, for stop walking
     * 
     * @param {Boolean} is in walking you can pass cheking in argument
     * @return {Boolean}
     */
    skip: (is = true) => skip = Boolean(is),

    /**
     * 
     * @param {String | Function} type type of node
     * @param {Function} handler 
     */
    walk(type, handler) {
      if (typeof type === 'function') {
        svelte.walk(ast, {
          enter(node) {
            if (!node.type) return
            if (skip) {
              skip = false
              this.skip()
            } else {
              type(node)
            }
          }
        })
      }
      if (typeof handler !== 'function' || !catalog.has(nodeName)) return
      for (const node of catalog.get(nodeName)){
        if (skip) {
          skip = false
          break
        } else {
          handler(node)
        }
      }
    }
  }
}

const astral = (input) => {
  const ast = svelte.parse(input)
  let html, css, instance, module

  return {
    html: () => html = html || createCatalogWalker(ast.html),
    css: () => css = css || createCatalogWalker(ast.css),
    instance: () => instance = instance || createCatalogWalker(ast.instance),
    module: () => module = module || createCatalogWalker(ast.module)
  }
}

const runPlugins = (plugins) => {
  if (!plugins || plugins.constructor.name !== 'Array') return
  return {
    markup: ({content, filename}) => {
      const ast = astral(content)
      for (const plugin of plugins) {
        if (typeof plugin !== 'function') continue
        if (plugin(ast, filename) === false) break
      }
    }
  }
}

module.exports = runPlugins