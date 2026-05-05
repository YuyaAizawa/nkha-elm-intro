import fs from 'fs'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkSlug from 'remark-slug'
import remarkRehype from 'remark-rehype'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const markdown = fs.readFileSync('index.md', 'utf8')

function collectText(node) {
  if (node.type === 'text') {
    return node.value
  }

  if (node.type === 'element' && Array.isArray(node.children)) {
    return node.children
      .map(collectText)
      .join('')
  }

  return ''
}

function makeId(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
}

function normalizeLocalHref(href) {
  if (typeof href !== 'string' || !href.startsWith('#')) {
    return href
  }

  return `#${makeId(href.slice(1))}`
}



function extractHeadings(options = {}) {
  const { store = [] } = options

  return (tree) => {
    visit(tree, 'heading', (node) => {
    const text = node.children
      .map(collectText)
      .join('')
    const id = makeId(text)

    store.push({ depth: node.depth, text, id })
    })
  }
}

function wrapSections() {
  return (tree) => {
    const oldChildren = tree.children
    const newChildren = []
    let currentSection = null

    for (const node of oldChildren) {
      if (node.type === 'element' && node.tagName === 'h2') {
        currentSection = {
          type: 'element',
          tagName: 'section',
          properties: {},
          children: []
        }
        newChildren.push(currentSection)
        currentSection.children.push(node)
      }
      else if (currentSection) {
        currentSection.children.push(node)
      }
      else {
        newChildren.push(node)
      }
    }
    tree.children = newChildren
  }
}

function removeWhitespaceTextNodes() {
  return (tree) => {
    if (Array.isArray(tree.children)) {
      tree.children = tree.children.filter(child =>
        !(child.type === 'text' && /^[\s\r\n\t]*$/.test(child.value))
      )
    }
    visit(tree, 'element', (node) => {
      if (!Array.isArray(node.children)) return
      node.children = node.children.filter(child =>
        !(child.type === 'text' && /^[\s\r\n\t]*$/.test(child.value))
      )
    })
  }
}

function unwrapParagraphInListItems() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'li'
      ) {
        const oldChildren = node.children
        const newChildren = []

        for (const liChild of oldChildren) {
          if (liChild.type === 'element' && liChild.tagName === 'p') {
            newChildren.splice(newChildren.length, 0, ...liChild.children)
          } else {
            newChildren.push(liChild)
          }
        }

        node.children = newChildren
      }
    })
  }
}

function fuseCaption() {
  return (tree) => {
    visit(tree, 'element', (parent) => {

      const children = parent.children
      for (let i = 0; i < children.length - 1; i++) {
        const node = children[i]
        const next = children[i + 1]

        const isPStrong =
          node.type === 'element' &&
          node.tagName === 'p' &&
          Array.isArray(node.children) &&
          node.children.length === 1 &&
          node.children[0].type === 'element' &&
          node.children[0].tagName === 'strong'

        const isPreCode =
          next.type === 'element' &&
          next.tagName === 'pre' &&
          Array.isArray(next.children) &&
          next.children.length === 1 &&
          next.children[0].type === 'element' &&
          next.children[0].tagName === 'code'

        const isTable =
          next.type === 'element' &&
          next.tagName === 'table'

        if (isPStrong && (isPreCode || isTable)) {
          // strong の中身を抽出
          const strongNode = node.children[0]
          const captionText = collectText(strongNode)
          const id = makeId(captionText)

          const figcaption = {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: strongNode.children ?? []
          }

          const figure = {
            type: 'element',
            tagName: 'figure',
            properties: { id },
            children: [ figcaption, next ]
          }

          children.splice(i, 2, figure)
          i--
        }
      }
    })
  }
}

function normalizeLocalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') {
        return
      }

      if (!node.properties) {
        return
      }

      node.properties.href = normalizeLocalHref(node.properties.href)
    })
  }
}

let headings = []
const processor = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkSlug)
  .use(extractHeadings, { store: headings })
  .use(remarkRehype)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: {
      className: ['anchor'],
      ariaHidden: 'true'
    },
    content: {
      type: 'text',
      value: '🔗'
    }
  })
  .use(removeWhitespaceTextNodes)
  .use(wrapSections)
  .use(unwrapParagraphInListItems)
  .use(fuseCaption)
  .use(normalizeLocalLinks)
  .use(rehypeStringify)

const bodyHtml = String(await processor.process(markdown))
const navHtml = `<nav class="toc">
  <ul>
    ${headings.map(h => `
      <li class="${h.depth > 1 ? 'indent' : ''}">
        <a href="#${h.id}">${h.text}</a>
      </li>`).join('\n')}
  </ul>
</nav>`

const githubCss = fs.readFileSync('node_modules/github-markdown-css/github-markdown-light.css', 'utf8')
const modCss = fs.readFileSync('style.css', 'utf8')
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
${githubCss}
${modCss}
  </style>
</head>
<body>
  ${navHtml}
  <div class="Box-sc-g0xbh4-0 bUQNHB">
    <article class="markdown-body entry-content container-lg" itemprop="text">
      ${bodyHtml}
    </article>
  </div>
</body>
</html>
`

fs.writeFileSync('index.html', html)
