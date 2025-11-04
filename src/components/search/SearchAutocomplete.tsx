import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Clock, X, TrendingUp } from "lucide-react";
import { getListings } from "@/lib/firestore";
import type { Listing } from "@/types";
import { formatPHP } from "@/lib/currency";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SearchAutocompleteProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

export const SearchAutocomplete = ({ 
  onSearch, 
  placeholder = "Search destinations, experiences, services...",
  className = ""
}: SearchAutocompleteProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Listing[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (query.trim().length > 2) {
      debounceSearch(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    try {
      const searches = [...recentSearches];
      // Remove if already exists
      const index = searches.indexOf(searchQuery);
      if (index > -1) {
        searches.splice(index, 1);
      }
      // Add to beginning
      searches.unshift(searchQuery);
      // Keep only last N searches
      const trimmed = searches.slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(trimmed);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    toast.success("Recent searches cleared");
  };

  const removeRecentSearch = (searchQuery: string) => {
    const updated = recentSearches.filter(s => s !== searchQuery);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const debounceSearch = (() => {
    let timeout: NodeJS.Timeout;
    return (searchQuery: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        await performSearch(searchQuery);
      }, 300);
    };
  })();

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const allListings = await getListings({ status: 'approved' });
      const lowerQuery = searchQuery.toLowerCase();
      
      const matched = allListings.filter(listing => {
        const matchesTitle = listing.title.toLowerCase().includes(lowerQuery);
        const matchesLocation = listing.location.toLowerCase().includes(lowerQuery);
        const matchesDescription = listing.description.toLowerCase().includes(lowerQuery);
        const matchesCategory = listing.category.toLowerCase().includes(lowerQuery);
        
        return matchesTitle || matchesLocation || matchesDescription || matchesCategory;
      });

      // Sort by relevance (title matches first, then location, then description)
      const sorted = matched.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 3 : 0;
        const aLocation = a.location.toLowerCase().includes(lowerQuery) ? 2 : 0;
        const aDesc = a.description.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const aScore = aTitle + aLocation + aDesc;

        const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 3 : 0;
        const bLocation = b.location.toLowerCase().includes(lowerQuery) ? 2 : 0;
        const bDesc = b.description.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const bScore = bTitle + bLocation + bDesc;

        return bScore - aScore;
      });

      setSuggestions(sorted.slice(0, 5)); // Show top 5 suggestions
    } catch (error) {
      console.error('Error searching:', error);
      toast.error("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (listing: Listing) => {
    saveRecentSearch(query);
    navigate(`/guest/listing/${listing.id}`);
    setOpen(false);
    setQuery("");
  };

  const handleSelectRecentSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    saveRecentSearch(searchQuery);
    if (onSearch) {
      onSearch(searchQuery);
    }
    navigate('/guest/browse');
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    saveRecentSearch(query);
    if (onSearch) {
      onSearch(query);
    }
    navigate('/guest/browse');
    setOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex gap-2 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={inputRef}
              type="search"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              className="pl-10 h-12 w-full"
              autoComplete="off"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
            <CommandList>
              {loading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              
              {!loading && suggestions.length === 0 && query.trim().length > 2 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {!loading && suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((listing) => (
                    <CommandItem
                      key={listing.id}
                      value={listing.id}
                      onSelect={() => handleSelectSuggestion(listing)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <img
                          src={listing.images?.[0] || '/placeholder.svg'}
                          alt={listing.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{listing.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{listing.location}</p>
                          <p className="text-xs font-semibold text-primary mt-1">{formatPHP(listing.price)}/night</p>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!loading && recentSearches.length > 0 && query.trim().length === 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search, index) => (
                    <CommandItem
                      key={index}
                      value={search}
                      onSelect={() => handleSelectRecentSearch(search)}
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{search}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentSearch(search);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="clear-all"
                    onSelect={clearRecentSearches}
                    className="cursor-pointer text-muted-foreground"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <X className="h-3 w-3" />
                      Clear all recent searches
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}

              {!loading && query.trim().length > 0 && (
                <CommandGroup>
                  <CommandItem
                    value="search-all"
                    onSelect={handleSubmit}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Search className="h-4 w-4" />
                      <span>Search for "{query}"</span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <Button type="submit" className="h-12 px-6">
        <Search className="h-4 w-4 mr-2 sm:mr-0 sm:inline" />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </form>
  );
};

