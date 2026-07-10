import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError, getOpenHours, type RestaurantInfo } from "@/lib/api";
import { applyBranding } from "@/lib/branding";

/** Slug du restaurant courant, issu de l'URL /restaurant/:slug */
export function useSlug(): string {
  const { slug } = useParams<{ slug: string }>();
  return slug ?? "";
}

export function useRestaurant(slug: string) {
  const query = useQuery<RestaurantInfo, ApiError>({
    queryKey: ["open-hours", slug],
    queryFn: () => getOpenHours(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      // Slug inconnu : inutile de réessayer
      error.code !== "-1" && failureCount < 2,
  });

  // Applique l'identité visuelle du restaurant au design system
  useEffect(() => {
    applyBranding(query.data?.merchant.design);
  }, [query.data]);

  return query;
}
