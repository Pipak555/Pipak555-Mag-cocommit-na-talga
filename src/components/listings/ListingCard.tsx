import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star, Users } from "lucide-react";
import type { Listing } from "@/types";
import { formatPHP } from "@/lib/currency";

interface ListingCardProps {
  listing: Listing;
  onView?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const ListingCard = memo(({ listing, onView, onFavorite, isFavorite }: ListingCardProps) => {
  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite?.();
  }, [onFavorite]);


  const handleViewClick = useCallback(() => {
    onView?.();
  }, [onView]);

  const discountedPrice = listing.discount && listing.discount > 0
    ? listing.price * (1 - listing.discount / 100)
    : listing.price;
  const formattedPrice = formatPHP(discountedPrice);
  const originalPrice = listing.discount && listing.discount > 0
    ? formatPHP(listing.price)
    : null;
  const rating = listing.averageRating && listing.averageRating > 0 
    ? listing.averageRating.toFixed(1) 
    : 'New';
  const reviewCount = listing.reviewCount && listing.reviewCount > 0 
    ? `(${listing.reviewCount})` 
    : '';
  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] h-full flex flex-col touch-manipulation">
      {/* Image Container with Gradient Overlay */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img 
          src={listing.images?.[0] || '/placeholder.svg'} 
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Action Buttons */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex gap-1.5 sm:gap-2 z-10">
          {/* Favorite Button - Shopee Style */}
          {onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className={`backdrop-blur-sm hover:scale-110 active:scale-95 transition-all duration-300 shadow-lg h-9 w-9 sm:h-11 sm:w-11 touch-manipulation ${
                isFavorite 
                  ? "bg-red-500/20 hover:bg-red-500/30" 
                  : "bg-white/90 hover:bg-white"
              }`}
              onClick={handleFavoriteClick}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-5 w-5 sm:h-6 sm:w-6 transition-all ${
                isFavorite 
                  ? "fill-red-500 text-red-500 scale-110 drop-shadow-lg" 
                  : "text-gray-700 fill-white"
              }`} />
            </Button>
          )}
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1.5 z-10">
          <Badge className="bg-white/95 backdrop-blur-sm text-gray-900 font-semibold shadow-lg capitalize border border-white/20 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
            {listing.category}
          </Badge>
        </div>
        
        {/* Price Badge */}
        <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-white/95 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg z-10 border border-white/20 flex flex-col items-end">
          {listing.discount && listing.discount > 0 && (
            <Badge className="bg-red-500 text-white text-[9px] sm:text-xs mb-0.5 px-1.5 py-0">
              -{listing.discount}%
            </Badge>
          )}
          <div className="flex items-center gap-1">
            {originalPrice && (
              <span className="text-[10px] sm:text-xs line-through text-gray-500">{originalPrice}</span>
            )}
            <span className="text-base sm:text-lg font-bold text-gray-900">{formattedPrice}</span>
            <span className="text-[10px] sm:text-xs text-gray-700 font-medium">/night</span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
        <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors text-foreground">
          {listing.title}
        </h3>
        <div className="flex items-center text-xs sm:text-sm text-foreground/90 mb-2 sm:mb-3">
          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0 text-foreground/80" />
          <span className="line-clamp-1">{listing.location}</span>
        </div>
        <p className="text-xs sm:text-sm text-foreground/85 line-clamp-2 mb-3 sm:mb-4 leading-relaxed flex-1">
          {listing.description}
        </p>
        
        {/* Rating & Guests */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50 mt-auto">
          <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-foreground/90 font-medium">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400 text-yellow-400" />
              <span>
                {rating}
                {reviewCount && (
                  <span className="text-foreground/60 ml-1">{reviewCount}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground/80" />
              <span>{listing.maxGuests} guests</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      {onView && (
        <CardFooter className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 mt-auto">
          <Button className="w-full h-11 sm:h-auto text-sm sm:text-base touch-manipulation" onClick={handleViewClick}>View Details</Button>
        </CardFooter>
      )}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.listing.id === nextProps.listing.id &&
    prevProps.listing.price === nextProps.listing.price &&
    prevProps.listing.discount === nextProps.listing.discount &&
    prevProps.listing.averageRating === nextProps.listing.averageRating &&
    prevProps.listing.reviewCount === nextProps.listing.reviewCount &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.onView === nextProps.onView &&
    prevProps.onFavorite === nextProps.onFavorite
  );
});

ListingCard.displayName = 'ListingCard';
