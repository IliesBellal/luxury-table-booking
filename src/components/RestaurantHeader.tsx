import { Info, MapPin, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { restaurantData } from "@/data/restaurant";

const merchant = restaurantData.data.merchant;

export function RestaurantHeader() {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-3">
        <img
          src={merchant.logo_url}
          alt={merchant.business_name}
          className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
        />
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {merchant.business_name}
        </h1>
      </div>

      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
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
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                {Object.entries(merchant.open_hours).map(([day, hours]) => (
                  <p key={day} className="text-sm text-foreground">
                    <span className="font-medium">{day}</span>{" "}
                    <span className="text-muted-foreground">{hours}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
