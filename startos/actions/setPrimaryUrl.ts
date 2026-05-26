import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk

// Selection value is encoded as "<siteId>|<url>" so a single flat dropdown
// can present "<site name> — <url>" options across every site at once,
// without needing chained selects (which Value.dynamicSelect can't do
// reactively in the same form).
const SEP = '|'

export const inputSpec = InputSpec.of({
  selection: Value.dynamicSelect(async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).const(effects)) || []
    const values: Record<string, string> = {}
    let defaultKey = ''

    for (const site of sites) {
      const urls = await sdk.serviceInterface
        .getOwn(
          effects,
          `${site.id}-site`,
          (i) => i?.addressInfo?.nonLocal.format() || [],
        )
        .const()

      for (const url of urls) {
        const key = `${site.id}${SEP}${url}`
        values[key] = `${site.name} — ${url}`
        if (site.primaryUrl === url && !defaultKey) {
          defaultKey = key
        }
      }
    }

    return {
      name: i18n('Primary URL'),
      description: i18n(
        'Pick the URL WordPress should use when it has no incoming request to derive one from — wp-cron events, email notifications, scheduled-post permalinks, sitemap entries. Each option is labelled with the site it belongs to.',
      ),
      values,
      default: defaultKey,
    }
  }),
})

export const setPrimaryUrl = sdk.Action.withInput(
  'set-primary-url',

  async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).const(effects)) || []
    return {
      name: i18n('Set Primary URL'),
      description: i18n(
        'Choose a primary URL for one of your sites. Affects URLs WordPress emits outside of an HTTP request (cron, email).',
      ),
      warning: null,
      allowedStatuses: 'any',
      group: null,
      visibility: sites.length > 0 ? 'enabled' : 'hidden',
    }
  },

  inputSpec,

  async ({ effects }) => {
    const sites = (await storeJson.read((s) => s.sites).once()) || []
    const current = sites.find((s) => s.primaryUrl)
    if (current && current.primaryUrl) {
      return { selection: `${current.id}${SEP}${current.primaryUrl}` }
    }
    return { selection: '' }
  },

  async ({ effects, input }) => {
    if (!input.selection || !input.selection.includes(SEP)) {
      return
    }
    const sepIdx = input.selection.indexOf(SEP)
    const siteId = input.selection.slice(0, sepIdx)
    const url = input.selection.slice(sepIdx + 1)

    const sites = (await storeJson.read((s) => s.sites).once()) || []
    if (!sites.some((s) => s.id === siteId)) {
      throw new Error(`Site ${siteId} not found`)
    }
    const updated = sites.map((s) =>
      s.id === siteId ? { ...s, primaryUrl: url } : s,
    )
    await storeJson.merge(effects, { sites: updated })
  },
)
