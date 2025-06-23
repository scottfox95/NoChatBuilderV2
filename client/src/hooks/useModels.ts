import { useQuery } from '@tanstack/react-query';
import { OpenaiModel } from '@shared/schema';

export default function useModels() {
  const { data: models = [], isLoading } = useQuery<OpenaiModel[]>({
    queryKey: ['/api/models'],
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change frequently
  });

  // Extract just the model IDs and provide fallback
  const modelIds = models.length > 0 
    ? models.map(m => m.id).sort()
    : ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']; // fallback

  return {
    models: modelIds,
    isLoading,
  };
}