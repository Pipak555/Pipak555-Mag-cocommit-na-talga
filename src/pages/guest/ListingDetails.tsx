import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListing, createBooking } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { ReviewList } from "@/components/reviews/ReviewList";
import { SocialShare } from "@/components/shared/SocialShare";
import { ListingCard } from "@/components/listings/ListingCard";
import type { Listing } from "@/types";

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadListing();
    }
  }, [id]);

  const loadListing = async () => {
    if (!id) return;
    const data = await getListing(id);
    setListing(data);
  };

  const calculateTotal = () => {
    if (!checkIn || !checkOut || !listing) return 0;
    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return days * listing.price;
  };

  const handleBooking = async () => {
    if (!user || !listing || !checkIn || !checkOut) {
      toast.error("Please select dates and sign in");
      return;
    }

    setLoading(true);
    try {
      await createBooking({
        listingId: listing.id,
        guestId: user.uid,
        hostId: listing.hostId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests,
        totalPrice: calculateTotal(),
        status: 'pending',
      });
      toast.success("Booking request sent!");
      navigate('/guest/dashboard');
    } catch (error) {
      toast.error("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };


  if (!listing) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/guest/browse')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Browse
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <img 
              src={listing.images[0] || '/placeholder.svg'} 
              alt={listing.title}
              className="w-full h-96 object-cover rounded-lg mb-4"
            />
            <div className="grid grid-cols-3 gap-2">
              {listing.images.slice(1, 4).map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-24 object-cover rounded" />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Badge>{listing.category}</Badge>
              {listing && (
                <SocialShare
                  url={window.location.href}
                  title={listing.title}
                  description={listing.description}
                  variant="outline"
                  size="sm"
                />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-center text-muted-foreground mb-4">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{listing.location}</span>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {listing.maxGuests} guests
              </span>
              {listing.bedrooms && <span>{listing.bedrooms} bedrooms</span>}
              {listing.bathrooms && <span>{listing.bathrooms} bathrooms</span>}
            </div>

            <p className="text-muted-foreground mb-6">{listing.description}</p>

            {listing.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((amenity, i) => (
                    <Badge key={i} variant="outline">{amenity}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>${listing.price}</span>
                  <span className="text-sm font-normal text-muted-foreground">per night</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Check-in</label>
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Check-out</label>
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => !checkIn || date <= checkIn}
                    className="rounded-md border"
                  />
                </div>

                {checkIn && checkOut && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between mb-2">
                      <span>Total</span>
                      <span className="font-bold">${calculateTotal()}</span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleBooking}
                  disabled={!checkIn || !checkOut || loading}
                >
                  {loading ? "Booking..." : "Request to Book"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ReviewList listingId={listing.id} />
        </div>

        {/* Similar Listings Recommendations */}
        <SimilarListings listingId={listing.id} />
      </div>
    </div>
  );
};

// Similar Listings Component
const SimilarListings = ({ listingId }: { listingId: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimilarListings();
    if (user) loadFavorites();
  }, [listingId, user]);

  const loadSimilarListings = async () => {
    try {
      const { getSimilarListings } = await import('@/lib/recommendations');
      const similar = await getSimilarListings(listingId, 4);
      setSimilarListings(similar);
    } catch (error) {
      console.error('Error loading similar listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setFavorites(userDoc.data().favorites || []);
    }
  };

  const handleFavorite = async (id: string) => {
    if (!user) {
      toast.error("Please login to add favorites");
      return;
    }
    try {
      const { toggleFavorite } = await import('@/lib/firestore');
      const newFavorites = await toggleFavorite(user.uid, id, favorites);
      setFavorites(newFavorites);
      toast.success(newFavorites.includes(id) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  if (loading || similarListings.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Similar Listings</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {similarListings.map((similarListing) => (
          <ListingCard
            key={similarListing.id}
            listing={similarListing}
            onView={() => navigate(`/guest/listing/${similarListing.id}`)}
            onFavorite={() => handleFavorite(similarListing.id)}
            isFavorite={favorites.includes(similarListing.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ListingDetails;
