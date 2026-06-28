import { z } from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())]).transform((v) =>
  Array.isArray(v) ? v.join(', ') : v
)

export const SceneProfileSchema = z.object({
  person: z.object({
    clothing: stringOrArray,
    style: stringOrArray,
    color_palette: stringOrArray,
  }),
  scene: z.object({
    type: stringOrArray,
    atmosphere: stringOrArray.optional(),
    elements: z.array(z.string()),
  }),
})

export const ShotSchema = z.object({
  id: z.number(),
  title: z.string(),
  composition: z.string(),
  scene_prompt: z.string(),
  behavior: z.string(),
  lighting: z.string(),
  angle: z.string(),
  status: z.enum(['pending', 'completed']).default('pending'),
})

export const PlanSchema = z.object({
  plan_name: z.string(),
  xhs_keywords: z.array(z.string()).optional(),
  shots: z.array(ShotSchema).length(9),
})

export function parseJSON<T>(text: string, schema: z.ZodType<T>): T {
  // strip markdown code fences if model wraps JSON
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  const parsed = JSON.parse(cleaned)
  return schema.parse(parsed)
}
