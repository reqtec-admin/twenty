type UseFilteredSelectOptionsFromRLSPredicatesArgs<TOption> = {
  fieldMetadataId?: string;
  objectMetadataNameSingular?: string | null;
  options?: TOption[] | null;
};

export const useFilteredSelectOptionsFromRLSPredicates = <TOption>({
  options,
}: UseFilteredSelectOptionsFromRLSPredicatesArgs<TOption>) => {
  return {
    filteredOptions: options ?? [],
    canSelectEmpty: true,
  };
};
