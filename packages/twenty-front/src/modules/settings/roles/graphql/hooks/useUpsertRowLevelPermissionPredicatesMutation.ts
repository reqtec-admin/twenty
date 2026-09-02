type UpsertRowLevelPermissionPredicatesMutationOptions = {
  variables?: {
    input?: unknown;
  };
};

export const useUpsertRowLevelPermissionPredicatesMutation = () => {
  const upsertRowLevelPermissionPredicates = async (
    _options?: UpsertRowLevelPermissionPredicatesMutationOptions,
  ) => {
    return { data: undefined, errors: undefined };
  };

  return [upsertRowLevelPermissionPredicates] as const;
};
