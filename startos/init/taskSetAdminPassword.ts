import { resetAdminPassword } from '../actions/resetAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'

// For every site, surface a critical task prompting the user to set its
// admin password. The task's pre-filled input pins it to a specific
// siteId, and replayId is per-site so multiple tasks coexist. The
// `input-not-matches` + `once: true` trigger means each task clears
// permanently the moment the user runs the Reset Admin Password action
// against that site.
export const taskSetAdminPassword = sdk.setupOnInit(async (effects) => {
  const sites = (await storeJson.read((s) => s.sites).const(effects)) || []

  for (const site of sites) {
    await sdk.action.createOwnTask(effects, resetAdminPassword, 'critical', {
      reason: i18n('Set the admin password for ${name}', { name: site.name }),
      replayId: `set-admin-password-${site.id}`,
      input: { kind: 'partial', value: { siteId: site.id } },
      when: { condition: 'input-not-matches', once: true },
    })
  }
})
