import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getListings } from "@/lib/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Trash2, Home, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatPHP } from "@/lib/currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Listing } from "@/types";

interface HostCoupon {
  listingId: string;
  listingTitle: string;
  promoCode: string;
  promoDiscount?: number;
  promoDescription?: string;
  promoMaxUses?: number;
  listingStatus: string;
}

interface HostCouponManagerProps {
  onCouponDeleted?: () => void;
}

export const HostCouponManager = ({ onCouponDeleted }: HostCouponManagerProps) => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<HostCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<HostCoupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadHostCoupons();
    }
  }, [user]);

  const loadHostCoupons = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const listings = await getListings({ hostId: user.uid }, user.uid);
      
      // Extract coupons from listings that have promoCode
      const hostCoupons: HostCoupon[] = listings
        .filter((listing: any) => listing.promoCode && listing.promoCode.trim() !== '')
        .map((listing: any) => ({
          listingId: listing.id,
          listingTitle: listing.title,
          promoCode: listing.promoCode,
          promoDiscount: listing.promoDiscount,
          promoDescription: listing.promoDescription,
          promoMaxUses: listing.promoMaxUses,
          listingStatus: listing.status,
        }));

      setCoupons(hostCoupons);
    } catch (error: any) {
      console.error('Error loading host coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (coupon: HostCoupon) => {
    setCouponToDelete(coupon);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete || !user) return;
    
    setDeleting(true);
    try {
      // Remove promo code fields from the listing
      await updateDoc(doc(db, 'listing', couponToDelete.listingId), {
        promoCode: null,
        promoDiscount: null,
        promoDescription: null,
        promoMaxUses: null,
        promo: null,
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Promo code "${couponToDelete.promoCode}" deleted successfully`);
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      
      // Reload coupons
      await loadHostCoupons();
      
      // Notify parent component
      onCouponDeleted?.();
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading coupons...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (coupons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            My Promo Codes
          </CardTitle>
          <CardDescription>Manage promo codes you've created for your listings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No promo codes created yet</p>
            <p className="text-sm mt-2">
              Create promo codes when creating or editing your listings
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            My Promo Codes
          </CardTitle>
          <CardDescription>
            Manage promo codes you've created for your listings ({coupons.length} active)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div
                key={`${coupon.listingId}-${coupon.promoCode}`}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-lg text-primary">
                            {coupon.promoCode}
                          </span>
                          <Badge
                            variant={
                              coupon.listingStatus === 'approved'
                                ? 'default'
                                : coupon.listingStatus === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {coupon.listingStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Home className="h-4 w-4" />
                          <span className="font-medium">{coupon.listingTitle}</span>
                        </div>
                        {coupon.promoDescription && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {coupon.promoDescription}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          {coupon.promoDiscount && (
                            <div>
                              <span className="text-muted-foreground">Discount: </span>
                              <span className="font-semibold text-green-600">
                                {formatPHP(coupon.promoDiscount)}
                              </span>
                            </div>
                          )}
                          {coupon.promoMaxUses && (
                            <div>
                              <span className="text-muted-foreground">Max Uses: </span>
                              <span className="font-semibold">{coupon.promoMaxUses}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(coupon)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Promo Code
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the promo code <strong>{couponToDelete?.promoCode}</strong> from the listing <strong>{couponToDelete?.listingTitle}</strong>?
              <br />
              <br />
              This action cannot be undone. The promo code will be removed from the listing and guests will no longer be able to use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

