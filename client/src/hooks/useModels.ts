import { useQuery } from '@tanstack/react-query';
import { OpenaiModel } from '@shared/schema';

export default function useModels() {
  const { data: models = [], isLoading } = useQuery<OpenaiModel[]>({
    queryKey: ['/api/models'],
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change frequently
  });

  // Extract just the model IDs and provide fallback
  const modelIds = models && models.length
    ? models.map(m => m.id).sort()                       // use cache
    : ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']; // tiny fallback only if cache empty

  return {
    models: modelIds,
    isLoading,
  };
}