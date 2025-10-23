import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Star } from "lucide-react";

interface PointsDisplayProps {
  points: number;
  onRedeem?: (points: number) => void;
}

export const PointsDisplay = ({ points, onRedeem }: PointsDisplayProps) => {
  const rewardTiers = [
    { points: 100, reward: "$10 discount", discount: 10 },
    { points: 250, reward: "$30 discount", discount: 30 },
    { points: 500, reward: "$75 discount", discount: 75 },
    { points: 1000, reward: "$200 discount", discount: 200 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
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
                  <div className="font-medium text-sm">{tier.reward}</div>
                  <div className="text-xs text-muted-foreground">
                    {tier.points} points
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                disabled={points < tier.points}
                onClick={() => onRedeem?.(tier.points)}
              >
                Redeem
              </Button>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
          <p className="font-semibold mb-1">How to earn points:</p>
          <ul className="space-y-1">
            <li>• Complete a booking: +50 points</li>
            <li>• Write a review: +20 points</li>
            <li>• Refer a friend: +100 points</li>
            <li>• Host a property: +30 points per booking</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
