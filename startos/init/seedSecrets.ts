import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { newPassword } from '../utils'

export const seedSecrets = sdk.setupOnInit(async (effects) => {
  const existing = await storeJson.read((s) => s.dbRootPassword).once()
  if (!existing) {
    await storeJson.merge(effects, { dbRootPassword: newPassword() })
  }
})
