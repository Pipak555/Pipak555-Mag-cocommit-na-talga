import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Award, Loader2 } from "lucide-react";
import { formatPHP } from "@/lib/currency";
import { toast } from "sonner";
import { redeemHostPointsForEwallet } from "@/lib/hostPointsService";
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

interface HostPointsDisplayProps {
  points: number;
  userId: string;
  onRedeem?: (walletAmount: number) => void; // Callback after successful redemption with wallet amount
}

export const HostPointsDisplay = ({ points, userId, onRedeem }: HostPointsDisplayProps) => {
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{ points: number; amount: number } | null>(null);

  // Reward tiers with conversion rate: 10 points = ₱1
  const rewardTiers = [
    { points: 50, amount: 5, description: "₱5 e-wallet money" },
    { points: 100, amount: 10, description: "₱10 e-wallet money" },
    { points: 250, amount: 25, description: "₱25 e-wallet money" },
    { points: 500, amount: 50, description: "₱50 e-wallet money" },
    { points: 1000, amount: 100, description: "₱100 e-wallet money" }
  ];

  const handleRedeemClick = (pointsToRedeem: number, walletAmount: number) => {
    if (!userId) {
      toast.error("User ID is required to redeem points");
      return;
    }
    
    // Show confirmation dialog
    console.log('Opening confirmation dialog for:', { pointsToRedeem, walletAmount });
    setSelectedTier({ points: pointsToRedeem, amount: walletAmount });
    setConfirmDialogOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!userId || !selectedTier) {
      return;
    }

    const { points: pointsToRedeem, amount: walletAmount } = selectedTier;
    setConfirmDialogOpen(false);
    setRedeeming(`${pointsToRedeem}`);
    
    try {
      const actualAmount = await redeemHostPointsForEwallet(
        userId,
        pointsToRedeem
      );
      
      toast.success(
        `Successfully redeemed ${pointsToRedeem} points for ${formatPHP(actualAmount)}! ` +
        `The amount has been added to your e-wallet.`
      );
      
      if (onRedeem) {
        onRedeem(actualAmount);
      }
    } catch (error: any) {
      toast.error(`Failed to redeem points: ${error.message || 'Unknown error'}`);
    } finally {
      setRedeeming(null);
      setSelectedTier(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-role-host" />
          Points & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-role-host/10 rounded-lg">
          <div className="text-3xl font-bold text-role-host">{points}</div>
          <div className="text-sm text-muted-foreground">Total Points</div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Available Rewards:</h4>
          {rewardTiers.map((tier) => (
            <div
              key={tier.points}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-role-host" />
                <div>
                  <div className="font-medium text-sm">{formatPHP(tier.amount)} e-wallet money</div>
                  <div className="text-xs text-muted-foreground">
                    {tier.points} points
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="role-host"
                disabled={points < tier.points || redeeming === `${tier.points}`}
                onClick={() => handleRedeemClick(tier.points, tier.amount)}
              >
                {redeeming === `${tier.points}` ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  'Redeem'
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
          <p className="font-semibold mb-1">How to earn points:</p>
          <ul className="space-y-1">
            <li>• Complete a booking: +10 points</li>
            <li>• Receive a 5-star rating: +5 bonus points</li>
            <li>• Listing approved: +5 points</li>
          </ul>
          <p className="font-semibold mt-3 mb-1">Rewards:</p>
          <ul className="space-y-1">
            <li>• Redeem points for e-wallet money</li>
            <li>• 10 points = ₱1 e-wallet balance</li>
          </ul>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialogOpen} 
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            setSelectedTier(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Points Redemption</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you sure you want to redeem your points?</p>
                {selectedTier && (
                  <div className="mt-4 space-y-2 p-3 bg-muted rounded-md">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Points to redeem:</span>
                      <span className="text-sm font-bold">{selectedTier.points} points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">E-wallet credit:</span>
                      <span className="text-sm font-bold text-primary">{formatPHP(selectedTier.amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Remaining points:</span>
                      <span className="text-sm font-bold">{points - selectedTier.points} points</span>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  This action cannot be undone. The points will be deducted and the amount will be added to your e-wallet balance.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRedeem}
              className="bg-role-host hover:bg-role-host/90"
            >
              Confirm Redemption
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};


