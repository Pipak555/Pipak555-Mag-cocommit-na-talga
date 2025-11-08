import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Check } from "lucide-react";
import { toast } from "sonner";
import { formatPHP } from "@/lib/currency";
import type { Coupon } from "@/types";

interface CouponManagerProps {
  coupons: Coupon[];
  onApplyCoupon?: (code: string) => void;
}

export const CouponManager = ({ coupons, onApplyCoupon }: CouponManagerProps) => {
  const [couponCode, setCouponCode] = useState("");

  const handleApply = () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    onApplyCoupon?.(couponCode);
    setCouponCode("");
  };

  const availableCoupons = coupons.filter(c => !c.used);
  const usedCoupons = coupons.filter(c => c.used);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Coupons & Discounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
          <Button onClick={handleApply}>Apply</Button>
        </div>

        {availableCoupons.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Available Coupons:</h4>
            {availableCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="p-3 border rounded-lg border-primary/20 bg-primary/5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-bold text-primary">
                      {coupon.code}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatPHP(coupon.discount)} off
                      {coupon.minSpend && ` on orders over ${formatPHP(coupon.minSpend)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Valid until: {new Date(coupon.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="secondary">{formatPHP(coupon.discount)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {usedCoupons.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Used Coupons:</h4>
            {usedCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="p-3 border rounded-lg opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm">{coupon.code}</div>
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
