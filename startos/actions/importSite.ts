import { storeJson, Site } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { newPassword, newSiteId, nextSitePort } from '../utils'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  name: Value.text({
    name: i18n('Site Name'),
    description: i18n(
      'A short label for the imported site (e.g. "Marketing", "Blog"). Used as the interface name in StartOS.',
    ),
    placeholder: 'My Imported Site',
    required: true,
    default: null,
  }),
  archivePath: Value.text({
    name: i18n('Archive Path'),
    description: i18n(
      'Path to the WordPress export archive inside File Browser. Must be a .tar.gz or .zip containing a wp-content directory and a .sql database dump at the archive root.',
    ),
    placeholder: 'e.g. wordpress-exports/my-old-site.tar.gz',
    required: true,
    default: null,
  }),
})

export const importSite = sdk.Action.withInput(
  'import-site',

  async () => ({
    name: i18n('Import Site'),
    description: i18n(
      'Import an existing WordPress site from a File Browser-hosted archive. The archive must contain wp-content/ and a .sql dump at the archive root.',
    ),
    warning: i18n(
      'Requires the File Browser package to be installed. Place your WordPress archive there first, then run this action with its path.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => ({ name: '', archivePath: '' }),

  async ({ effects, input }) => {
    const existing = (await storeJson.read((s) => s.sites).once()) || []
    const usedPorts = new Set<number>(existing.map((s) => s.port))
    const id = newSiteId()
    const port = nextSitePort(usedPorts)

    const site: Site = {
      id,
      port,
      name: input.name,
      adminUser: 'admin',
      adminPassword: newPassword(),
      adminEmail: `admin@${id}.local`,
      pendingImport: input.archivePath,
    }

    await storeJson.merge(effects, { sites: [...existing, site] })
  },
)
