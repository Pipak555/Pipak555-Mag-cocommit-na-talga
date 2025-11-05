import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationMapPickerProps {
  value: string;
  onChange: (location: string) => void;
}

interface LocationClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function LocationClickHandler({ onLocationSelect }: LocationClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

export const LocationMapPicker = ({ value, onChange }: LocationMapPickerProps) => {
  const [position, setPosition] = useState<[number, number]>([14.5995, 120.9842]); // Manila, Philippines default
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reverse geocoding: Convert coordinates to address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      setIsGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Firebnb-Spark/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Build address string from response
      const address = data.address;
      const addressParts: string[] = [];

      if (address.road || address.street) {
        addressParts.push(address.road || address.street);
      }
      if (address.suburb || address.neighbourhood || address.city_district) {
        addressParts.push(address.suburb || address.neighbourhood || address.city_district);
      }
      if (address.city || address.town || address.village) {
        addressParts.push(address.city || address.town || address.village);
      }
      if (address.state || address.province) {
        addressParts.push(address.state || address.province);
      }
      if (address.country) {
        addressParts.push(address.country);
      }

      return addressParts.length > 0 
        ? addressParts.join(", ")
        : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error: any) {
      console.error("Reverse geocoding error:", error);
      // Fallback to coordinates if geocoding fails
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle location selection from map click
  const handleLocationSelect = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    setIsLoading(true);

    try {
      const address = await reverseGeocode(lat, lng);
      onChange(address);
      toast.success("Location selected");
    } catch (error: any) {
      toast.error("Failed to get address. Using coordinates.");
      onChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPosition([latitude, longitude]);
        setMarkerPosition([latitude, longitude]);
        
        // Center map on current location
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
        }

        try {
          const address = await reverseGeocode(latitude, longitude);
          onChange(address);
          toast.success("Current location set");
        } catch (error: any) {
          toast.error("Failed to get address. Using coordinates.");
          onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Failed to get your location. Please allow location access.");
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle manual address input and geocode it
  const handleAddressSearch = async (address: string) => {
    if (!address || address.trim().length < 3) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Firebnb-Spark/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search address");
      }

      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setPosition([lat, lng]);
        setMarkerPosition([lat, lng]);
        
        // Center map on found location
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }

        // Update address with full address from search result
        const addressParts: string[] = [];
        const addr = result.address;
        
        if (addr.road || addr.street) {
          addressParts.push(addr.road || addr.street);
        }
        if (addr.suburb || addr.neighbourhood || addr.city_district) {
          addressParts.push(addr.suburb || addr.neighbourhood || addr.city_district);
        }
        if (addr.city || addr.town || addr.village) {
          addressParts.push(addr.city || addr.town || addr.village);
        }
        if (addr.state || addr.province) {
          addressParts.push(addr.state || addr.province);
        }
        if (addr.country) {
          addressParts.push(addr.country);
        }

        const fullAddress = addressParts.length > 0 
          ? addressParts.join(", ")
          : result.display_name;
        
        onChange(fullAddress);
        toast.success("Location found");
      } else {
        toast.error("Location not found. Please try a different address.");
      }
    } catch (error: any) {
      console.error("Geocoding error:", error);
      toast.error("Failed to search location");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Address Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search address or click on map..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (value.trim()) {
                  handleAddressSearch(value);
                }
              }
            }}
            className="pl-10"
          />
          {(isLoading || isGeocoding) && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          disabled={isLoading}
          title="Use current location"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      {/* Map */}
      <div className="border rounded-lg overflow-hidden" style={{ height: "400px" }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(map) => {
            mapRef.current = map;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationClickHandler onLocationSelect={handleLocationSelect} />
          {markerPosition && (
            <Marker position={markerPosition} />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Click on the map to select a location, search for an address, or use your current location.
      </p>
    </div>
  );
};

