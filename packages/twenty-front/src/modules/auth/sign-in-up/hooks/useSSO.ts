import { GET_AUTHORIZATION_URL_FOR_SSO } from '@/auth/graphql/mutations/getAuthorizationUrlForSSO';
import { useRedirect } from '@/domain-manager/hooks/useRedirect';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useMutation } from '@apollo/client/react';

type GetAuthorizationUrlForSSOData = {
  getAuthorizationUrlForSSO?: {
    authorizationURL?: string;
  };
};

export const useSSO = () => {
  const { redirect } = useRedirect();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [getAuthorizationUrlForSSO] = useMutation(GET_AUTHORIZATION_URL_FOR_SSO);

  const redirectToSSOLoginPage = async (identityProviderId: string) => {
    const result = await getAuthorizationUrlForSSO({
      variables: {
        input: {
          identityProviderId,
        },
      },
    });

    if (result.error) {
      enqueueErrorSnackBar({
        apolloError: result.error,
      });
      return;
    }

    const data = result.data as GetAuthorizationUrlForSSOData | undefined;
    const authorizationURL = data?.getAuthorizationUrlForSSO?.authorizationURL;

    if (typeof authorizationURL === 'string') {
      redirect(authorizationURL);
    }
  };

  return { redirectToSSOLoginPage };
};
