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

  // Applique l'identité du restaurant : couleurs et titre de l'onglet
  useEffect(() => {
    if (!query.data) return;
    applyBranding(query.data.merchant.design);
    document.title = `Réserver une table — ${query.data.merchant.business_name}`;
  }, [query.data]);

  return query;
}
