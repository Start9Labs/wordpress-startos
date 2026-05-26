import { sdk } from '../sdk'
import { manage } from './manage'
import { setPrimaryUrl } from './setPrimaryUrl'
import { showAdminCredentials } from './showAdminCredentials'

export const actions = sdk.Actions.of()
  .addAction(manage)
  .addAction(setPrimaryUrl)
  .addAction(showAdminCredentials)
