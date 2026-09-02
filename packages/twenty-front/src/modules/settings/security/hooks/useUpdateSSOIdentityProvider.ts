export const useUpdateSSOIdentityProvider = () => {
  const updateSSOIdentityProvider = async (_args: {
    id: string;
    status?: unknown;
  }) => {
    return { error: undefined };
  };

  return { updateSSOIdentityProvider };
};
