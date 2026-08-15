import fs from 'fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import remarkSlug from 'remark-slug'
import remarkRehype from 'remark-rehype'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const projectDir = dirname(fileURLToPath(import.meta.url))

const pages = [
  {
    input: 'index.md',
    output: 'dist/index.html',
    root: './',
    id: 'intro'
  },
  {
    input: 'practice.md',
    output: 'dist/practice/index.html',
    root: '../',
    id: 'practice'
  }
]

function collectText(node) {
  if (node.type === 'text') {
    return node.value
  }

  if (Array.isArray(node.children)) {
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
  if (typeof href !== 'string') {
    return href
  }

  const hashIndex = href.indexOf('#')
  if (hashIndex < 0) {
    return href
  }

  const path = href.slice(0, hashIndex)
  const fragment = href.slice(hashIndex + 1)

  // http:, https:, mailto: などの外部リンクは触らない
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path) || path.startsWith('//')) {
    return href
  }

  if (fragment.length === 0) {
    return href
  }

  // remark/rehype が既に URI encode している場合も一度戻してから id 化する
  let decodedFragment = fragment
  try {
    decodedFragment = decodeURIComponent(fragment)
  } catch {
    // 不正な percent encoding は元の文字列のまま扱う
  }

  return `${path}#${makeId(decodedFragment)}`
}

function makeTermDefinitionNode(label, term) {
  return {
    type: 'termDefinition',
    data: {
      hName: 'span',
      hProperties: {
        className: ['term-def']
      }
    },
    children: [
      {
        type: 'termLabel',
        data: {
          hName: 'span',
          hProperties: {
            className: ['term-label']
          }
        },
        children: [
          {
            type: 'text',
            value: label
          }
        ]
      },
      {
        type: 'termWord',
        data: {
          hName: 'span',
          hProperties: {
            className: ['term-word']
          }
        },
        children: [
          {
            type: 'text',
            value: term
          }
        ]
      }
    ]
  }
}

function splitTermDefinitionsText(value) {
  const pattern = /\{([^{}\n/]+)\/([^{}\n/]+)\}/g
  const nodes = []
  let lastIndex = 0

  for (const match of value.matchAll(pattern)) {
    const [whole, label, term] = match
    const index = match.index

    if (lastIndex < index) {
      nodes.push({
        type: 'text',
        value: value.slice(lastIndex, index)
      })
    }

    nodes.push(makeTermDefinitionNode(label.trim(), term.trim()))

    lastIndex = index + whole.length
  }

  if (lastIndex < value.length) {
    nodes.push({
      type: 'text',
      value: value.slice(lastIndex)
    })
  }

  return nodes
}

function rewriteTermDefinitions() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') {
        return
      }

      if (!node.value.includes('{') || !node.value.includes('/')) {
        return
      }

      const nodes = splitTermDefinitionsText(node.value)

      if (nodes.length === 1 && nodes[0].type === 'text') {
        return
      }

      parent.children.splice(index, 1, ...nodes)

      return index + nodes.length
    })
  }
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

function isDirectiveLabelNode(node) {
  return (
    node?.type === 'paragraph' &&
    node.data?.directiveLabel === true
  )
}
function makeSummaryNode(text) {
  return {
    type: 'paragraph',
    data: {
      hName: 'summary'
    },
    children: [
      {
        type: 'text',
        value: text
      }
    ]
  }
}
function asSummaryNode(node) {
  node.data = node.data || {}
  node.data.hName = 'summary'
  delete node.data.directiveLabel
  return node
}
function extractSummaryAndDetails(node, defaultSummary) {
  const children = Array.isArray(node.children) ? node.children : []
  const firstChild = children[0]

  if (isDirectiveLabelNode(firstChild)) {
    return {
      summary: asSummaryNode(firstChild),
      details: children.slice(1)
    }
  }

  return {
    summary: makeSummaryNode(defaultSummary),
    details: children
  }
}

function makeColumnTitleNode(text) {
  return {
    type: 'paragraph',
    data: {
      hName: 'p',
      hProperties: {
        className: ['column-title']
      }
    },
    children: [
      {
        type: 'text',
        value: text
      }
    ]
  }
}

function asColumnTitleNode(node) {
  node.data = node.data || {}
  node.data.hName = 'p'
  node.data.hProperties = {
    ...(node.data.hProperties || {}),
    className: ['column-title']
  }
  delete node.data.directiveLabel
  return node
}

function extractColumnTitleAndBody(node, defaultTitle) {
  const children = Array.isArray(node.children) ? node.children : []
  const firstChild = children[0]

  if (isDirectiveLabelNode(firstChild)) {
    return {
      title: asColumnTitleNode(firstChild),
      body: children.slice(1)
    }
  }

  return {
    title: makeColumnTitleNode(defaultTitle),
    body: children
  }
}

function rewriteDirective() {
  const defaultSummaries = {
    answer: '解答を見る',
    details: '詳細を見る',
    spoiler: '開く'
  }
  const defaultColumnTitles = {
    note: '補足',
    caution: '注意',
    "coffee-break": 'コーヒーブレイク'
  }

  return (tree) => {
    visit(tree, 'containerDirective', (node) => {
      const defaultSummary = defaultSummaries[node.name]

      // details
      if (defaultSummary) {
        const { summary, details } = extractSummaryAndDetails(node, defaultSummary)

        node.data = node.data || {}
        node.data.hName = 'details'
        node.data.hProperties = {
          className: [node.name]
        }
        node.children = [summary, ...details]
        return
      }

      // aside
      const defaultColumnTitle = defaultColumnTitles[node.name]

      if (defaultColumnTitle) {
        const { title, body } = extractColumnTitleAndBody(node, defaultColumnTitle)

        node.data = node.data || {}
        node.data.hName = 'aside'
        node.data.hProperties = {
          className: [node.name]
        }
        node.children = [title, ...body]
        return
      }

      throw new Error("unknown directive: "+node.name)
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

        const isList =
          next.type === 'element' &&
          (next.tagName === 'ul' || next.tagName === 'ol')

        if (isPStrong && (isPreCode || isTable || isList)) {
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

function createProcessor(headings) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkSlug)
    .use(rewriteDirective)
    .use(rewriteTermDefinitions)
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
}

function makeTocHtml(headings) {
  const tocHeadings = headings.filter(h => h.depth === 2)

  return `<nav class="toc" aria-label="目次">
  <div class="toc-title">目次</div>
  <ul>
    ${tocHeadings.map(h => `
      <li>
        <a href="#${h.id}">${h.text}</a>
      </li>`).join('\n')}
  </ul>
</nav>`
}

function makeSiteNavHtml(page) {
  const links = [
    {
      id: 'intro',
      href: page.root,
      label: 'Elm入門'
    },
    {
      id: 'practice',
      href: `${page.root}practice/`,
      label: '実践編：ポーカー'
    }
  ]

  return `<nav class="site-nav" aria-label="ページ">
    ${links.map(link => {
      const current = link.id === page.id ? ' aria-current="page"' : ''
      return `<a href="${link.href}"${current}>${link.label}</a>`
    }).join(' / ')}
  </nav>`
}

const githubCss = fs.readFileSync(
  join(projectDir, 'node_modules/github-markdown-css/github-markdown-light.css'),
  'utf8'
)
const modCss = fs.readFileSync(join(projectDir, 'style.css'), 'utf8')

async function convertPage(page) {
  const input = join(projectDir, page.input)
  const output = join(projectDir, page.output)
  const markdown = fs.readFileSync(input, 'utf8')

  const headings = []
  const processor = createProcessor(headings)
  const bodyHtml = String(await processor.process(markdown))
  const tocHtml = makeTocHtml(headings)
  const siteNavHtml = makeSiteNavHtml(page)

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
  ${tocHtml}
  <div class="Box-sc-g0xbh4-0 bUQNHB">
    <article class="markdown-body entry-content container-lg" itemprop="text">
      ${siteNavHtml}
      ${bodyHtml}
    </article>
  </div>
</body>
</html>
`

  fs.mkdirSync(dirname(output), { recursive: true })
  fs.writeFileSync(output, html)
}

for (const page of pages) {
  await convertPage(page)
}
