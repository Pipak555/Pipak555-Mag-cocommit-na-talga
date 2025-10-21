import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListing, createBooking } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, MapPin, Users, Star } from "lucide-react";
import { toast } from "sonner";
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
            <Badge className="mb-2">{listing.category}</Badge>
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
      </div>
    </div>
  );
};

export default ListingDetails;
