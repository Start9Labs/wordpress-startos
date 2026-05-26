import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { newPassword } from '../utils'

const { InputSpec, Value } = sdk

export const resetAdminPassword = sdk.Action.withInput(
  'reset-admin-password',

  async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).const(effects)) || []
    return {
      name: i18n('Set/Reset Admin Password'),
      description: i18n(
        'Generate a new random password for the WordPress admin account on one of your sites and reveal it. Use this for initial sign-in, or any time you need to recover access — once you change the password from inside WordPress this is the only way to get back in.',
      ),
      warning: null,
      allowedStatuses: 'only-running',
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
        description: i18n('Which site to reset the admin password on.'),
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

    const password = newPassword()

    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'wordpress' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/data',
        readonly: false,
      }),
      'reset-admin-password',
      async (sub) => {
        await sub.execFail([
          'wp',
          `--path=/data/sites/${site.id}`,
          '--allow-root',
          'user',
          'update',
          site.adminUser,
          `--user_pass=${password}`,
        ])
      },
    )

    const updated = sites.map((s) =>
      s.id === site.id ? { ...s, adminPassword: password } : s,
    )
    await storeJson.merge(effects, { sites: updated })

    return {
      version: '1',
      title: i18n('Admin Password Reset for ${name}', { name: site.name }),
      message: i18n(
        'A new admin password has been set on this site. Sign in at /wp-admin with these credentials.',
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
            value: password,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
