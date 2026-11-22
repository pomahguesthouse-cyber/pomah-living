import { useQuery } from "@tanstack/react-query";
import type { DemoPhoto } from "@/lib/flipping-demos";
import { fetchDemoPhotoUrls } from "@/services/flipping-demo-photo-service";

export function useDemoPhotoUrls(photos: DemoPhoto[], scope: string) {
  const paths = photos.map(({ path }) => path).sort();
  return useQuery({
    queryKey: ["flipping-demo-photo-urls", scope, paths],
    queryFn: () => fetchDemoPhotoUrls(paths),
    enabled: paths.length > 0,
    staleTime: 240_000,
    refetchInterval: 240_000,
    retry: false,
  });
}
