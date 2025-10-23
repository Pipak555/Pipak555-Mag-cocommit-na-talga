import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createTransaction } from "@/lib/firestore";
import { DollarSign } from "lucide-react";

interface PayPalButtonProps {
  amount: number;
  userId: string;
  description: string;
  onSuccess: () => void;
}

export const PayPalButton = ({ amount, userId, description, onSuccess }: PayPalButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate PayPal sandbox payment
      // In production, integrate with actual PayPal SDK
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create transaction record
      await createTransaction({
        userId,
        type: 'payment',
        amount,
        description: `PayPal payment: ${description}`
      });

      toast.success("Payment successful!");
      onSuccess();
    } catch (error) {
      toast.error("Payment failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-[#0070ba] hover:bg-[#003087]"
    >
      <DollarSign className="h-4 w-4 mr-2" />
      {loading ? "Processing..." : `Pay $${amount.toFixed(2)} with PayPal`}
    </Button>
  );
};
