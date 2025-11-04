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
    const resetFilters = { location: '', guests: 1, category: 'all' };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Search Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="location">Where</Label>
            <Input
              id="location"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>

          <div>
            <Label>Check-in</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.checkIn ? format(filters.checkIn, "PP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
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
            <Label>Check-out</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.checkOut ? format(filters.checkOut, "PP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="guests">Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: Number(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger>
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
          className="w-full"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
        </Button>

        {showAdvanced && (
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="minPrice">Min Price (₱)</Label>
              <Input
                id="minPrice"
                type="number"
                min="0"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="maxPrice">Max Price (₱)</Label>
              <Input
                id="maxPrice"
                type="number"
                min="0"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                placeholder="No limit"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">Apply Filters</Button>
          <Button onClick={handleReset} variant="outline">Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
};
