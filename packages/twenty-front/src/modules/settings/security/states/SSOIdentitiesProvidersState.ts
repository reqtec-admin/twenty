import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type SSOIdentityProvider } from '@/settings/security/types/SSOIdentityProvider';

export const SSOIdentitiesProvidersState = createAtomState<
  Omit<SSOIdentityProvider, '__typename'>[]
>({
  key: 'SSOIdentitiesProvidersState',
  defaultValue: [],
});
