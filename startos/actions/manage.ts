import { z } from '@start9labs/start-sdk'
import { storeJson, Site } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { newAdminUser, newPassword, newSiteId, nextSitePort } from '../utils'

const { InputSpec, Value, List } = sdk

const slugPattern = '^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,62}$'

export const inputSpec = InputSpec.of({
  sites: Value.list(
    List.obj(
      { name: i18n('Sites') },
      {
        displayAs: '{{name}}',
        uniqueBy: { all: ['id', 'name'] },
        spec: InputSpec.of({
          id: Value.hidden(z.string().nullable()),
          name: Value.text({
            name: i18n('Site Name'),
            description: i18n(
              'A short label for this site (e.g. "Marketing", "Blog"). Used as the interface name in StartOS.',
            ),
            placeholder: 'My Site',
            required: true,
            default: null,
            patterns: [
              {
                regex: slugPattern,
                description: i18n(
                  'Up to 63 characters: letters, numbers, spaces, hyphens, underscores. Must start with a letter or number.',
                ),
              },
            ],
          }),
        }),
      },
    ),
  ),
})

export const manage = sdk.Action.withInput(
  'manage',

  async () => ({
    name: i18n('Manage Sites'),
    description: i18n(
      'Add new WordPress sites, rename existing ones, or remove ones you no longer need. Each row is an independent WordPress install with its own database and hostname.',
    ),
    warning: i18n(
      'Removing a site discards its database and all uploaded files. This cannot be undone.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    sites: ((await storeJson.read((s) => s.sites).once()) || []).map((s) => ({
      id: s.id,
      name: s.name,
    })),
  }),

  async ({ effects, input }) => {
    const existing = (await storeJson.read((s) => s.sites).once()) || []
    const existingById = new Map<string, Site>(existing.map((s) => [s.id, s]))

    const usedPorts = new Set<number>()
    for (const row of input.sites) {
      if (row.id) {
        const e = existingById.get(row.id)
        if (e) usedPorts.add(e.port)
      }
    }

    const sites: Site[] = input.sites.map((row) => {
      if (row.id && existingById.has(row.id)) {
        const e = existingById.get(row.id)!
        return { ...e, name: row.name }
      }
      const id = newSiteId()
      const port = nextSitePort(usedPorts)
      usedPorts.add(port)
      return {
        id,
        port,
        name: row.name,
        adminUser: newAdminUser(),
        adminPassword: newPassword(),
        adminEmail: `admin@${id}.local`,
      }
    })

    await storeJson.merge(effects, { sites })
  },
)
