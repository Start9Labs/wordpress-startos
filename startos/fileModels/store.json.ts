import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const siteShape = z.object({
  id: z.string(),
  port: z.number().int().nonnegative(),
  name: z.string(),
  adminUser: z.string(),
  adminPassword: z.string(),
  adminEmail: z.string(),
  primaryUrl: z.string().nullable().default(null),
})

const shape = z.object({
  dbRootPassword: z.string().optional(),
  sites: z.array(siteShape).default([]),
})

export type Site = z.infer<typeof siteShape>
export type Store = z.infer<typeof shape>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
