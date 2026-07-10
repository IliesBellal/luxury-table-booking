import { SearchX } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-xl bg-card p-8 shadow-sm text-center space-y-3 max-w-md w-full">
        <SearchX className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Page introuvable
        </h1>
        <p className="text-sm text-muted-foreground">
          Vérifiez le lien de réservation fourni par votre restaurant — il doit être de la forme{" "}
          <span className="font-mono text-xs">/restaurant/nom-du-restaurant</span>.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
