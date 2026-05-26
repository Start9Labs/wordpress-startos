import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk

export const showAdminCredentials = sdk.Action.withInput(
  'show-admin-credentials',

  async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).const(effects)) || []
    return {
      name: i18n('Show Admin Credentials'),
      description: i18n(
        'Reveal the auto-generated WordPress admin username and password for one of your sites.',
      ),
      warning: null,
      allowedStatuses: 'any',
      group: null,
      visibility: sites.length > 0 ? 'enabled' : 'hidden',
    }
  },

  async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).once()) || []
    const values: Record<string, string> = {}
    for (const s of sites) values[s.id] = s.name
    const defaultId = sites[0]?.id ?? ''
    return InputSpec.of({
      siteId: Value.select({
        name: i18n('Site'),
        description: i18n('Which site to reveal credentials for.'),
        default: defaultId,
        values,
      }),
    })
  },

  async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).once()) || []
    return { siteId: sites[0]?.id ?? '' }
  },

  async ({ effects, input }) => {
    const sites = (await storeJson.read((s) => s.sites).once()) || []
    const site = sites.find((s) => s.id === input.siteId)
    if (!site) throw new Error(`Site ${input.siteId} not found`)

    return {
      version: '1',
      title: i18n('Admin Credentials for ${name}', { name: site.name }),
      message: i18n(
        'Use these credentials to sign in at /wp-admin on this site.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: site.adminUser,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: site.adminPassword,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
