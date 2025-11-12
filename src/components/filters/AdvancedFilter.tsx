import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";

export interface FilterValues {
  location: string;
  checkIn?: Date;
  checkOut?: Date;
  guests: number;
  category: string;
  minPrice?: number;
  maxPrice?: number;
}

interface AdvancedFilterProps {
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues; // Add this prop
}

export const AdvancedFilter = ({ onFilterChange, initialFilters }: AdvancedFilterProps) => {
  const [filters, setFilters] = useState<FilterValues>(
    initialFilters || {
      location: '',
      guests: 1,
      category: 'all'
    }
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync with parent filters when they change (e.g., from URL params)
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    const resetFilters = { 
      location: '', 
      guests: 1, 
      category: 'all',
      checkIn: undefined,
      checkOut: undefined,
      minPrice: undefined,
      maxPrice: undefined
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3 md:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
          <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
          Search Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="location" className="text-sm sm:text-base">Where</Label>
            <Input
              id="location"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1"
            />
          </div>

          <div>
            <Label className="text-sm sm:text-base">Check-in</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1 touch-manipulation">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.checkIn ? format(filters.checkIn, "PP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.checkIn}
                  onSelect={(date) => setFilters({ ...filters, checkIn: date })}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-sm sm:text-base">Check-out</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1 touch-manipulation">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.checkOut ? format(filters.checkOut, "PP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.checkOut}
                  onSelect={(date) => setFilters({ ...filters, checkOut: date })}
                  disabled={(date) => date < (filters.checkIn || new Date())}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="guests" className="text-sm sm:text-base">Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: Number(e.target.value) })}
              className="h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-sm sm:text-base">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger className="h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1 touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="home">Homes</SelectItem>
                <SelectItem value="experience">Experiences</SelectItem>
                <SelectItem value="service">Services</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full h-11 sm:h-auto text-sm sm:text-base touch-manipulation"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
        </Button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
            <div>
              <Label htmlFor="minPrice" className="text-sm sm:text-base">Min Price (₱)</Label>
              <Input
                id="minPrice"
                type="number"
                min="0"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                placeholder="0"
                className="h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxPrice" className="text-sm sm:text-base">Max Price (₱)</Label>
              <Input
                id="maxPrice"
                type="number"
                min="0"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                placeholder="No limit"
                className="h-11 sm:h-10 md:h-auto text-base sm:text-sm mt-1"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button onClick={handleApply} className="flex-1 h-11 sm:h-auto text-sm sm:text-base touch-manipulation">Apply Filters</Button>
          <Button onClick={handleReset} variant="outline" className="h-11 sm:h-auto text-sm sm:text-base touch-manipulation">Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
};
