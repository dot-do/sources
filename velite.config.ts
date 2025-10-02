import { defineConfig, defineCollection, s } from 'velite'

const sources = defineCollection({
  name: 'Source',
  pattern: 'sources/**/*.mdx',
  schema: s.object({
    title: s.string(),
    slug: s.path(),
    description: s.string(),
    type: s.enum(['api', 'database', 'file', 'stream', 'other']).optional(),
    connection: s.string().optional(),
    schema: s.string().optional(),
    metadata: s.object({
      ns: s.string().default('source'),
      visibility: s.enum(['public', 'private', 'unlisted']).default('public')
    }).default({}),
    tags: s.array(s.string()).default([]),
    content: s.mdx()
  }).transform(data => ({ ...data, url: `/sources/${data.slug}` }))
})

export default defineConfig({
  root: '.',
  output: { data: '.velite', assets: 'public/static', base: '/static/', name: '[name]-[hash:6].[ext]', clean: true },
  collections: { sources },
  mdx: { rehypePlugins: [], remarkPlugins: [] }
})
