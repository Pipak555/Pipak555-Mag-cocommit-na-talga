import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getCancellationRequests, 
  approveCancellationRequest, 
  rejectCancellationRequest,
  subscribeToCancellationRequests 
} from "@/lib/cancellationRequestService";
import { getBooking, getListing, getUserProfile } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Home, DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CancellationRequest, Booking, Listing } from "@/types";
import LoadingScreen from "@/components/ui/loading-screen";
import { formatPHP } from "@/lib/currency";
import { format } from "date-fns";

interface CancellationRequestWithDetails extends CancellationRequest {
  booking?: Booking;
  listing?: Listing;
  guestName?: string;
  guestEmail?: string;
  hostName?: string;
  hostEmail?: string;
}

const ReviewCancellationRequests = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [requests, setRequests] = useState<CancellationRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReview, setRequestToReview] = useState<CancellationRequestWithDetails | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequestWithDetails | null>(null);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }

    // Subscribe to pending cancellation requests
    const unsubscribe = subscribeToCancellationRequests(
      (updatedRequests) => {
        loadRequestDetails(updatedRequests.filter(r => r.status === 'pending'));
      },
      { status: 'pending' }
    );

    return () => unsubscribe();
  }, [user, userRole, navigate]);

  const loadRequestDetails = async (cancellationRequests: CancellationRequest[]) => {
    try {
      setLoading(true);
      const requestsWithDetails: CancellationRequestWithDetails[] = await Promise.all(
        cancellationRequests.map(async (request) => {
          try {
            // Load booking
            const booking = await getBooking(request.bookingId);
            
            // Load listing
            let listing: Listing | null = null;
            if (booking?.listingId) {
              listing = await getListing(booking.listingId, undefined); // Admin sees all data including promo codes
            }

            // Load guest info
            let guestName = 'N/A';
            let guestEmail = 'N/A';
            if (request.guestId) {
              try {
                const guestProfile = await getUserProfile(request.guestId);
                guestName = guestProfile?.fullName || 'N/A';
                guestEmail = guestProfile?.email || 'N/A';
              } catch (error) {
                console.error('Error loading guest profile:', error);
              }
            }

            // Load host info
            let hostName = 'N/A';
            let hostEmail = 'N/A';
            if (request.hostId) {
              try {
                const hostProfile = await getUserProfile(request.hostId);
                hostName = hostProfile?.fullName || 'N/A';
                hostEmail = hostProfile?.email || 'N/A';
              } catch (error) {
                console.error('Error loading host profile:', error);
              }
            }

            return {
              ...request,
              booking: booking || undefined,
              listing: listing || undefined,
              guestName,
              guestEmail,
              hostName,
              hostEmail,
            };
          } catch (error) {
            console.error('Error loading request details:', error);
            return {
              ...request,
              booking: undefined,
              listing: undefined,
              guestName: 'Error loading',
              guestEmail: 'Error loading',
              hostName: 'Error loading',
              hostEmail: 'Error loading',
            };
          }
        })
      );

      setRequests(requestsWithDetails);
    } catch (error: any) {
      console.error('Error loading cancellation requests:', error);
      toast.error(`Failed to load cancellation requests: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request: CancellationRequestWithDetails) => {
    setRequestToReview(request);
    setAdminNotes('');
    setApproveDialogOpen(true);
  };

  const handleReject = (request: CancellationRequestWithDetails) => {
    setRequestToReview(request);
    setAdminNotes('');
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (request: CancellationRequestWithDetails) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!requestToReview || !user) return;
    
    setProcessing(true);
    try {
      await approveCancellationRequest(
        requestToReview.id,
        user.uid,
        adminNotes.trim() || undefined
      );
      
      toast.success('Cancellation request approved. Refund has been processed.');
      setApproveDialogOpen(false);
      setRequestToReview(null);
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error approving cancellation request:', error);
      toast.error(`Failed to approve cancellation request: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!requestToReview || !user) return;
    
    setProcessing(true);
    try {
      await rejectCancellationRequest(
        requestToReview.id,
        user.uid,
        adminNotes.trim() || undefined
      );
      
      toast.success('Cancellation request rejected.');
      setRejectDialogOpen(false);
      setRequestToReview(null);
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error rejecting cancellation request:', error);
      toast.error(`Failed to reject cancellation request: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!user || userRole !== 'admin') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/admin/dashboard" className="mb-6" />

        <h1 className="text-3xl font-bold mb-6">Review Cancellation Requests</h1>

        {loading ? (
          <LoadingScreen />
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending cancellation requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Cancellation Request #{request.id.slice(0, 8)}
                    </CardTitle>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <CardDescription>
                    Requested on {format(new Date(request.requestedAt), 'PPp')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Booking Info */}
                    {request.booking && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Booking ID</p>
                          <p className="font-mono text-sm">{request.booking.id.slice(0, 8)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Total Price</p>
                          <p className="font-semibold">{formatPHP(request.booking.totalPrice || 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Check-in</p>
                          <p>{format(new Date(request.booking.checkIn), 'PP')}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Check-out</p>
                          <p>{format(new Date(request.booking.checkOut), 'PP')}</p>
                        </div>
                      </div>
                    )}

                    {/* Guest & Host Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Guest
                        </p>
                        <p className="font-medium">{request.guestName}</p>
                        <p className="text-sm text-muted-foreground">{request.guestEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Host
                        </p>
                        <p className="font-medium">{request.hostName}</p>
                        <p className="text-sm text-muted-foreground">{request.hostEmail}</p>
                      </div>
                    </div>

                    {/* Listing Info */}
                    {request.listing && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Listing</p>
                        <p className="font-medium">{request.listing.title}</p>
                        <p className="text-sm text-muted-foreground">{request.listing.location}</p>
                      </div>
                    )}

                    {/* Reason */}
                    {request.reason && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Cancellation Reason</p>
                        <p className="text-sm bg-muted p-3 rounded-md">{request.reason}</p>
                      </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(request)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(request)}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Cancellation Request</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Approving this request will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Cancel the booking</li>
                  <li>Process a refund to the guest's wallet</li>
                  <li>Notify the guest and host</li>
                </ul>
                {requestToReview?.booking && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-md">
                    <p className="text-sm font-medium">Refund Amount:</p>
                    <p className="text-lg font-bold text-primary">
                      {formatPHP(requestToReview.booking.totalPrice || 0)}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any notes about this approval..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} onClick={() => setAdminNotes('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Approve & Process Refund'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Cancellation Request</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Rejecting this request will keep the booking active. The guest will be notified of the rejection.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Rejection Reason (Optional)</Label>
              <Textarea
                id="reject-notes"
                placeholder="Provide a reason for rejection (this will be shared with the guest)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} onClick={() => setAdminNotes('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Reject Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancellation Request Details</DialogTitle>
            <DialogDescription>
              Full information about this cancellation request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                <p className="font-mono text-sm">{selectedRequest.id}</p>
              </div>
              <Separator />
              {selectedRequest.booking && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Booking Details</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Booking ID:</span>
                        <span className="font-mono">{selectedRequest.booking.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge>{selectedRequest.booking.status}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Check-in:</span>
                        <span>{format(new Date(selectedRequest.booking.checkIn), 'PPp')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Check-out:</span>
                        <span>{format(new Date(selectedRequest.booking.checkOut), 'PPp')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guests:</span>
                        <span>{selectedRequest.booking.guests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Price:</span>
                        <span className="font-semibold">{formatPHP(selectedRequest.booking.totalPrice || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              {selectedRequest.listing && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Listing Details</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Title: </span>
                        <span className="font-medium">{selectedRequest.listing.title}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location: </span>
                        <span>{selectedRequest.listing.location}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Guest Information</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name: </span>{selectedRequest.guestName}</p>
                  <p><span className="text-muted-foreground">Email: </span>{selectedRequest.guestEmail}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Host Information</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name: </span>{selectedRequest.hostName}</p>
                  <p><span className="text-muted-foreground">Email: </span>{selectedRequest.hostEmail}</p>
                </div>
              </div>
              {selectedRequest.reason && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Cancellation Reason</p>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedRequest.reason}
                    </p>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Request Timeline</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Requested: </span>
                    {format(new Date(selectedRequest.requestedAt), 'PPp')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewCancellationRequests;

