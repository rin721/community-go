import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export function usePageSearchParams(): URLSearchParams {
  const searchParams = useSearchParams();
  return useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
}
