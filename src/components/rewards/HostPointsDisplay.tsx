import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Award, Loader2 } from "lucide-react";
import { formatPHP } from "@/lib/currency";
import { toast } from "sonner";
import { redeemHostPointsForSubscriptionDiscount } from "@/lib/hostPointsService";

interface HostPointsDisplayProps {
  points: number;
  userId: string;
  onRedeem?: (discountAmount: number) => void; // Callback after successful redemption with discount amount
}

export const HostPointsDisplay = ({ points, userId, onRedeem }: HostPointsDisplayProps) => {
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const rewardTiers = [
    { points: 200, discount: 100, description: "₱100 subscription discount" },
    { points: 500, discount: 250, description: "₱250 subscription discount" },
    { points: 1000, discount: 500, description: "₱500 subscription discount" },
    { points: 2000, discount: 1000, description: "₱1000 subscription discount" }
  ];

  const handleRedeem = async (pointsToRedeem: number, discountAmount: number) => {
    if (!userId) {
      toast.error("User ID is required to redeem points");
      return;
    }

    setRedeeming(`${pointsToRedeem}`);
    try {
      const actualDiscount = await redeemHostPointsForSubscriptionDiscount(
        userId,
        pointsToRedeem
      );
      
      toast.success(
        `Successfully redeemed ${pointsToRedeem} points for ${formatPHP(actualDiscount)} discount! ` +
        `You can use this discount on your next subscription purchase.`
      );
      
      if (onRedeem) {
        onRedeem(actualDiscount);
      }
    } catch (error: any) {
      toast.error(`Failed to redeem points: ${error.message || 'Unknown error'}`);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Points & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <div className="text-3xl font-bold text-primary">{points}</div>
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
                <Gift className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">{formatPHP(tier.discount)} subscription discount</div>
                  <div className="text-xs text-muted-foreground">
                    {tier.points} points
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                disabled={points < tier.points || redeeming === `${tier.points}`}
                onClick={() => handleRedeem(tier.points, tier.discount)}
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
            <li>• Complete a booking: 1 point per ₱100 (minimum 50 points)</li>
            <li>• Receive a 5-star rating: +25 bonus points</li>
            <li>• Listing approved: +100 points</li>
          </ul>
          <p className="font-semibold mt-3 mb-1">Rewards:</p>
          <ul className="space-y-1">
            <li>• Redeem points for subscription discounts</li>
            <li>• 100 points = ₱50 discount</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};


