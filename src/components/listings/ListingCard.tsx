import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin } from "lucide-react";
import type { Listing } from "@/types";

interface ListingCardProps {
  listing: Listing;
  onView?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const ListingCard = ({ listing, onView, onFavorite, isFavorite }: ListingCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        <img 
          src={listing.images[0] || '/placeholder.svg'} 
          alt={listing.title}
          className="w-full h-full object-cover"
        />
        {onFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Heart className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </Button>
        )}
        <Badge className="absolute top-2 left-2">{listing.category}</Badge>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{listing.title}</h3>
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">{listing.location}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold">${listing.price}</span>
          <span className="text-sm text-muted-foreground">per night</span>
        </div>
      </CardContent>
      
      {onView && (
        <CardFooter className="p-4 pt-0">
          <Button className="w-full" onClick={onView}>View Details</Button>
        </CardFooter>
      )}
    </Card>
  );
};
