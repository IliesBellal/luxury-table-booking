import { Accessibility, Info, MapPin, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Merchant, MerchantPublic } from "@/lib/api";

interface RestaurantHeaderProps {
  merchant?: (Merchant | MerchantPublic) & { open_hours?: Record<string, string> };
  handicapAccess?: boolean;
}

const WEEK_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function RestaurantHeader({ merchant, handicapAccess }: RestaurantHeaderProps) {
  if (!merchant) {
    return (
      <div className="flex items-center gap-3 px-1">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  const openHours = merchant.open_hours;

  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-3 min-w-0">
        {merchant.logo_url ? (
          <img
            src={merchant.logo_url}
            alt={merchant.business_name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-border shrink-0"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold text-foreground ring-2 ring-border">
            {merchant.business_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
            {merchant.business_name}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {merchant.address.city ? merchant.address.city : ""}
          </p>
        </div>
      </div>

      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
            <Info className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{merchant.business_name}</DrawerTitle>
            <DrawerDescription>Informations sur l'établissement</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-8">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-foreground">
                {merchant.address.street_number} {merchant.address.street}
                <br />
                {merchant.address.zip_code} {merchant.address.city}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${merchant.phone}`}
                className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
              >
                {merchant.phone}
              </a>
            </div>
            {handicapAccess && (
              <div className="flex items-center gap-3">
                <Accessibility className="h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-foreground">Accès personnes à mobilité réduite</p>
              </div>
            )}
            {openHours && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  {WEEK_ORDER.filter((day) => openHours[day]).map((day) => (
                    <p key={day} className="text-sm text-foreground">
                      <span className="font-medium">{day}</span>{" "}
                      <span className="text-muted-foreground">{openHours[day]}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
