import { sdk } from '../sdk'
import { manage } from './manage'
import { resetAdminPassword } from './resetAdminPassword'
import { setPrimaryUrl } from './setPrimaryUrl'

export const actions = sdk.Actions.of()
  .addAction(manage)
  .addAction(setPrimaryUrl)
  .addAction(resetAdminPassword)
