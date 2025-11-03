import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star, Users } from "lucide-react";
import type { Listing } from "@/types";

interface ListingCardProps {
  listing: Listing;
  onView?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const ListingCard = ({ listing, onView, onFavorite, isFavorite }: ListingCardProps) => {
  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      {/* Image Container with Gradient Overlay */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={listing.images?.[0] || '/placeholder.svg'} 
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Favorite Button */}
        {onFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg z-10"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Heart className={`h-5 w-5 transition-all ${isFavorite ? "fill-red-500 text-red-500 scale-110" : "text-gray-700"}`} />
          </Button>
        )}
        
        {/* Category Badge */}
        <Badge className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-foreground font-medium shadow-md capitalize z-10">
          {listing.category}
        </Badge>
        
        {/* Price Badge */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg z-10">
          <span className="text-lg font-bold text-foreground">${listing.price}</span>
          <span className="text-xs text-muted-foreground">/night</span>
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-5">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
          <span className="line-clamp-1">{listing.location}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {listing.description}
        </p>
        
        {/* Rating & Guests */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span>4.8</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{listing.maxGuests} guests</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      {onView && (
        <CardFooter className="px-5 pb-5 pt-0">
          <Button className="w-full h-11" onClick={onView}>View Details</Button>
        </CardFooter>
      )}
    </Card>
  );
};
