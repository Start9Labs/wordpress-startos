import { resetAdminPassword } from '../actions/resetAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'

// `input` + `when: 'input-not-matches'` would auto-clear the task; both
// deadlock init on start-os <= 0.4.0-beta.9 (fixed in start-os#3273).
// resetAdminPassword's handler calls clearTask instead.
export const taskSetAdminPassword = sdk.setupOnInit(async (effects) => {
  const sites = (await storeJson.read((s) => s.sites).const(effects)) || []

  for (const site of sites) {
    await sdk.action.createOwnTask(effects, resetAdminPassword, 'important', {
      reason: i18n('Set the admin password for ${name}', { name: site.name }),
      replayId: `set-admin-password-${site.id}`,
    })
  }
})
