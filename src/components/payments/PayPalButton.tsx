import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createTransaction } from "@/lib/firestore";
import { DollarSign } from "lucide-react";
import { formatPHP, CURRENCY_CODE } from "@/lib/currency";

interface PayPalButtonProps {
  amount: number;
  userId: string;
  description: string;
  onSuccess: () => void;
}

const PayPalButtonContent = ({ amount, userId, description, onSuccess }: PayPalButtonProps) => {
  const [{ isPending }] = usePayPalScriptReducer();

  const createOrder = (data: any, actions: any) => {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: amount.toFixed(2),
          currency_code: CURRENCY_CODE
        },
        description: description
      }]
    });
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      const order = await actions.order.capture();
      
      // Create transaction record
      await createTransaction({
        userId,
        type: 'payment',
        amount,
        description: `PayPal payment: ${description}`,
        status: 'completed',
        paymentMethod: 'paypal',
        paymentId: order.id
      });

      toast.success("Payment successful!");
      onSuccess();
    } catch (error) {
      toast.error("Payment failed");
      console.error(error);
      
      // Create failed transaction record
      await createTransaction({
        userId,
        type: 'payment',
        amount,
        description: `PayPal payment (failed): ${description}`,
        status: 'failed',
        paymentMethod: 'paypal'
      });
    }
  };

  const onError = (err: any) => {
    toast.error("Payment error occurred");
    console.error(err);
  };

  if (isPending) {
    return <div className="w-full h-10 bg-muted animate-pulse rounded" />;
  }

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      style={{ layout: "vertical" }}
    />
  );
};

export const PayPalButton = (props: PayPalButtonProps) => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const isProduction = import.meta.env.VITE_PAYPAL_ENV === 'production';

  // If PayPal is not configured, use simulated payment
  if (!clientId || clientId === '') {
    return <SimulatedPayPalButton {...props} />;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: CURRENCY_CODE,
        intent: "capture",
        components: "buttons",
      }}
    >
      <PayPalButtonContent {...props} />
    </PayPalScriptProvider>
  );
};

// Fallback simulated payment
const SimulatedPayPalButton = ({ amount, userId, description, onSuccess }: PayPalButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create transaction record
      await createTransaction({
        userId,
        type: 'payment',
        amount,
        description: `PayPal payment (simulated): ${description}`,
        status: 'completed',
        paymentMethod: 'paypal'
      });

      toast.success("Payment successful! (Simulated - Configure PayPal SDK for real payments)");
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
      {loading ? "Processing..." : `Pay ${formatPHP(amount)} with PayPal (Simulated)`}
    </Button>
  );
};
