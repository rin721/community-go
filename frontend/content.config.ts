import { defineCollection, defineContentConfig, z } from "@nuxt/content"

const docsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number().default(0),
  category: z.string().optional(),
  draft: z.boolean().default(false),
  navigation: z.object({
    title: z.string().optional(),
    icon: z.string().optional()
  }).optional()
})

export default defineContentConfig({
  collections: {
    docsZhCn: defineCollection({
      type: "page",
      source: {
        include: "docs/zh-CN/**/*.md",
        prefix: "/docs"
      },
      schema: docsSchema
    }),
    docsEn: defineCollection({
      type: "page",
      source: {
        include: "docs/en/**/*.md",
        prefix: "/docs"
      },
      schema: docsSchema
    }),
    docsJa: defineCollection({
      type: "page",
      source: {
        include: "docs/ja/**/*.md",
        prefix: "/docs"
      },
      schema: docsSchema
    })
  }
})
