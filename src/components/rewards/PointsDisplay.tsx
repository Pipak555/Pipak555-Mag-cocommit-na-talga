import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Award } from "lucide-react";
import { formatPHP } from "@/lib/currency";

interface PointsDisplayProps {
  points: number;
  onRedeem?: (points: number) => void;
}

export const PointsDisplay = ({ points, onRedeem }: PointsDisplayProps) => {
  const rewardTiers = [
    { points: 100, reward: "₱10 discount", discount: 10 },
    { points: 250, reward: "₱30 discount", discount: 30 },
    { points: 500, reward: "₱75 discount", discount: 75 },
    { points: 1000, reward: "₱200 discount", discount: 200 }
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Award className="h-5 w-5 text-primary" />
          Points & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Points Display */}
        <div className="text-center p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg border border-primary/20">
          <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">{points}</div>
          <div className="text-sm text-muted-foreground font-medium">Total Points</div>
        </div>

        {/* Available Rewards */}
        <div className="space-y-3">
          <h4 className="font-semibold text-base mb-4">Available Rewards:</h4>
          <div className="space-y-3">
            {rewardTiers.map((tier) => (
              <div
                key={tier.points}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-base">{formatPHP(tier.discount)} discount</div>
                    <div className="text-sm text-muted-foreground">
                      {tier.points} points
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={points < tier.points}
                  onClick={() => onRedeem?.(tier.points)}
                  className="min-w-[100px]"
                >
                  Redeem
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <p className="font-semibold text-sm mb-3 text-foreground">How to earn points:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Complete a booking: +50 points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Write a review: +20 points</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
