import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { BackButton } from "@/components/shared/BackButton";
import { Bookmark, Search, User, Home, Calendar, MessageSquare, ChevronDown, ChevronUp, Loader2, Filter, ArrowLeft } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { UserProfile, Listing, WishlistItem } from '@/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserWithWishlist extends UserProfile {
  id: string;
  wishlistDetails?: Array<{
    listing: Listing | null;
    wishlistItem: WishlistItem | string;
  }>;
}

const AdminWishlist = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [users, setUsers] = useState<UserWithWishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'home' | 'experience' | 'service'>('all');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [listingDialogOpen, setListingDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadWishlistData();
  }, [user, userRole, navigate]);

  const loadWishlistData = async () => {
    setLoading(true);
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserWithWishlist));

      console.log('📊 Total users loaded:', allUsers.length);

      // Filter users who have wishlists
      const usersWithWishlists = allUsers.filter(user => {
        const wishlist = user.wishlist || [];
        return wishlist.length > 0;
      });

      console.log('📋 Users with wishlists:', usersWithWishlists.length);
      console.log('📋 Wishlist data sample:', usersWithWishlists.slice(0, 2).map(u => ({
        name: u.fullName,
        email: u.email,
        wishlistCount: u.wishlist?.length,
        wishlistSample: u.wishlist?.[0]
      })));

      // Load listing details for each wishlist item
      const usersWithDetails = await Promise.all(
        usersWithWishlists.map(async (user) => {
          const wishlist = user.wishlist || [];
          
          const wishlistDetails = await Promise.all(
            wishlist.map(async (item) => {
              const listingId = typeof item === 'string' ? item : item.listingId;
              
              try {
                const listingDoc = await getDoc(doc(db, 'listing', listingId));
                const listing = listingDoc.exists() 
                  ? { id: listingDoc.id, ...listingDoc.data() } as Listing
                  : null;
                
                return {
                  listing,
                  wishlistItem: item
                };
              } catch (error) {
                console.error(`Error loading listing ${listingId}:`, error);
                return {
                  listing: null,
                  wishlistItem: item
                };
              }
            })
          );

          return {
            ...user,
            wishlistDetails
          };
        })
      );

      setUsers(usersWithDetails);
      console.log('✅ Wishlist data loaded successfully:', usersWithDetails.length, 'users');
    } catch (error) {
      console.error('❌ Error loading wishlist data:', error);
      toast.error('Failed to load wishlist data');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleViewListing = (listing: Listing | null) => {
    if (listing) {
      setSelectedListing(listing);
      setListingDialogOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Failed to logout');
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.id.toLowerCase().includes(searchLower)
    );
    
    if (!matchesSearch) return false;
    
    // Category filter
    if (categoryFilter !== 'all') {
      // Check if user has at least one wishlist item matching the category
      const hasMatchingCategory = user.wishlistDetails?.some(item => 
        item.listing?.category === categoryFilter
      );
      
      if (!hasMatchingCategory) return false;
    }
    
    return true;
  });

  const totalWishlistItems = users.reduce((sum, user) => {
    return sum + (user.wishlist?.length || 0);
  }, 0);

  // Calculate filtered statistics
  const filteredWishlistItems = filteredUsers.reduce((sum, user) => {
    if (categoryFilter === 'all') {
      return sum + (user.wishlist?.length || 0);
    }
    return sum + (user.wishlistDetails?.filter(item => item.listing?.category === categoryFilter).length || 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading wishlist data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-custom flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo variant="admin" onClick={() => navigate('/admin/dashboard')} />
            <BackButton to="/admin/dashboard" />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-custom py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-role-admin" />
            User Wishlists
          </h1>
          <p className="text-muted-foreground">
            View and analyze what properties users are interested in
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                {categoryFilter !== 'all' ? 'Filtered Users' : 'Total Users with Wishlists'}
              </CardDescription>
              <CardTitle className="text-3xl">{filteredUsers.length}</CardTitle>
              {categoryFilter !== 'all' && (
                <p className="text-xs text-muted-foreground mt-1">of {users.length} total</p>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                {categoryFilter !== 'all' ? 'Filtered Items' : 'Total Wishlist Items'}
              </CardDescription>
              <CardTitle className="text-3xl">{filteredWishlistItems}</CardTitle>
              {categoryFilter !== 'all' && (
                <p className="text-xs text-muted-foreground mt-1">of {totalWishlistItems} total</p>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average per User</CardDescription>
              <CardTitle className="text-3xl">
                {filteredUsers.length > 0 ? (filteredWishlistItems / filteredUsers.length).toFixed(1) : '0'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="home">🏠 Home</SelectItem>
                <SelectItem value="experience">🎭 Experience</SelectItem>
                <SelectItem value="service">🔧 Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Wishlist Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              User Wishlists
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="font-normal">
                  {categoryFilter === 'home' && '🏠 Home'}
                  {categoryFilter === 'experience' && '🎭 Experience'}
                  {categoryFilter === 'service' && '🔧 Service'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Click on a user to expand and view their wishlist details
              {categoryFilter !== 'all' && ' (filtered by category)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No wishlist data found</p>
                <p className="text-sm mb-4">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Users have not added any properties to their wishlists yet'}
                </p>
                {users.length === 0 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg max-w-md mx-auto text-left">
                    <p className="text-sm font-medium mb-2">💡 How guests add to wishlist:</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      <li>Guest browses listings</li>
                      <li>Clicks the bookmark icon on a listing</li>
                      <li>Item is added to their wishlist</li>
                      <li>Data appears here automatically</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <Collapsible
                    key={user.id}
                    open={expandedUsers.has(user.id)}
                    onOpenChange={() => toggleUserExpanded(user.id)}
                  >
                    <Card className="shadow-sm">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="text-left">
                              <p className="font-medium">{user.fullName || 'Unknown User'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary">
                              {(() => {
                                const filteredCount = categoryFilter === 'all' 
                                  ? user.wishlist?.length || 0
                                  : user.wishlistDetails?.filter(item => item.listing?.category === categoryFilter).length || 0;
                                return `${filteredCount} ${filteredCount === 1 ? 'item' : 'items'}`;
                              })()}
                            </Badge>
                            {expandedUsers.has(user.id) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-4 bg-muted/30">
                          <div className="space-y-4">
                            {user.wishlistDetails && user.wishlistDetails.length > 0 ? (
                              user.wishlistDetails
                                .filter(item => categoryFilter === 'all' || item.listing?.category === categoryFilter)
                                .map((item, index) => {
                                const wishlistItem = item.wishlistItem;
                                const isExtended = typeof wishlistItem !== 'string';
                                
                                return (
                                  <Card key={index} className="bg-background">
                                    <CardContent className="p-4">
                                      <div className="flex gap-4">
                                        {/* Listing Image */}
                                        {item.listing?.images?.[0] && (
                                          <img
                                            src={item.listing.images[0]}
                                            alt={item.listing.title}
                                            className="w-24 h-24 object-cover rounded-lg"
                                          />
                                        )}
                                        
                                        {/* Listing Details */}
                                        <div className="flex-1">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold">
                                                  {item.listing?.title || 'Listing Unavailable'}
                                                </h4>
                                                {item.listing?.category && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {item.listing.category === 'home' && '🏠 Home'}
                                                    {item.listing.category === 'experience' && '🎭 Experience'}
                                                    {item.listing.category === 'service' && '🔧 Service'}
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-sm text-muted-foreground">
                                                {item.listing?.location}
                                              </p>
                                            </div>
                                            {item.listing && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewListing(item.listing)}
                                              >
                                                View Details
                                              </Button>
                                            )}
                                          </div>

                                          {/* Extended Wishlist Info */}
                                          {isExtended && (
                                            <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-lg">
                                              {wishlistItem.addedAt && (
                                                <div className="flex items-center gap-2 text-sm">
                                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                                  <span className="text-muted-foreground">Added:</span>
                                                  <span>{new Date(wishlistItem.addedAt).toLocaleDateString()}</span>
                                                </div>
                                              )}

                                              {wishlistItem.recommendations && (
                                                <div className="text-sm">
                                                  <div className="flex items-start gap-2">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <div>
                                                      <span className="text-muted-foreground font-medium">User Notes:</span>
                                                      <p className="mt-1">{wishlistItem.recommendations}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              {wishlistItem.propertyRequirements && (
                                                <div className="text-sm">
                                                  <span className="text-muted-foreground font-medium">Requirements:</span>
                                                  <div className="flex gap-4 mt-1">
                                                    {wishlistItem.propertyRequirements.beds && (
                                                      <span>🛏️ {wishlistItem.propertyRequirements.beds} beds</span>
                                                    )}
                                                    {wishlistItem.propertyRequirements.bedrooms && (
                                                      <span>🚪 {wishlistItem.propertyRequirements.bedrooms} bedrooms</span>
                                                    )}
                                                    {wishlistItem.propertyRequirements.bathrooms && (
                                                      <span>🚿 {wishlistItem.propertyRequirements.bathrooms} bathrooms</span>
                                                    )}
                                                    {wishlistItem.propertyRequirements.guests && (
                                                      <span>👥 {wishlistItem.propertyRequirements.guests} guests</span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}

                                              {wishlistItem.desiredAmenities && wishlistItem.desiredAmenities.length > 0 && (
                                                <div className="text-sm">
                                                  <span className="text-muted-foreground font-medium">Desired Amenities:</span>
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {wishlistItem.desiredAmenities.map((amenity, i) => (
                                                      <Badge key={i} variant="outline" className="text-xs">
                                                        {amenity}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {wishlistItem.addedFromBooking && (
                                                <div className="text-sm text-muted-foreground">
                                                  <span>📅 Added from previous booking</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground">No wishlist details available</p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Listing Details Dialog */}
      <Dialog open={listingDialogOpen} onOpenChange={setListingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedListing?.title}</DialogTitle>
            <DialogDescription>{selectedListing?.location}</DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              {/* Images */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedListing.images.slice(0, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${selectedListing.title} - ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedListing.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Price per night:</span>
                    <p className="text-lg font-bold">₱{selectedListing.pricePerNight}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Category:</span>
                    <p className="capitalize">{selectedListing.category}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium">Capacity:</span>
                  <div className="flex gap-4 mt-1">
                    {selectedListing.beds && <span>🛏️ {selectedListing.beds} beds</span>}
                    {selectedListing.bedrooms && <span>🚪 {selectedListing.bedrooms} bedrooms</span>}
                    {selectedListing.bathrooms && <span>🚿 {selectedListing.bathrooms} bathrooms</span>}
                    {selectedListing.guests && <span>👥 {selectedListing.guests} guests</span>}
                  </div>
                </div>

                {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Amenities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedListing.amenities.map((amenity, i) => (
                        <Badge key={i} variant="outline">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className="ml-2" variant={selectedListing.status === 'approved' ? 'default' : 'secondary'}>
                    {selectedListing.status}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/guest/listing/${selectedListing.id}`)}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                View Full Listing
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWishlist;

