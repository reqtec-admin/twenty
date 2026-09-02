export const useDeleteSSOIdentityProvider = () => {
  const deleteSSOIdentityProvider = async (_args: {
    identityProviderId: string;
  }) => {
    return { error: undefined };
  };

  return { deleteSSOIdentityProvider };
};
