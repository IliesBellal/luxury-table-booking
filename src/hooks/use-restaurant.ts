import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError, getOpenHours, type RestaurantInfo } from "@/lib/api";

/** Slug du restaurant courant, issu de l'URL /restaurant/:slug */
export function useSlug(): string {
  const { slug } = useParams<{ slug: string }>();
  return slug ?? "";
}

export function useRestaurant(slug: string) {
  return useQuery<RestaurantInfo, ApiError>({
    queryKey: ["open-hours", slug],
    queryFn: () => getOpenHours(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      // Slug inconnu : inutile de réessayer
      error.code !== "-1" && failureCount < 2,
  });
}
