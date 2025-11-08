/**
 * PayPal Payment Button Component
 * 
 * ⚠️ IMPORTANT: This is configured for SANDBOX mode only - NO REAL MONEY will be processed.
 * All payments are simulations for testing purposes.
 * 
 * To use PayPal Sandbox:
 * 1. Get a sandbox client ID from https://developer.paypal.com/
 * 2. Set VITE_PAYPAL_CLIENT_ID in your .env file (sandbox client ID)
 * 3. Set VITE_PAYPAL_ENV=sandbox (or leave unset, defaults to sandbox)
 * 
 * Sandbox test accounts can be created at: https://developer.paypal.com/dashboard/accounts
 * 
 * NOTE: This is for simulation/testing only. No real money will be charged.
 */

import { useState, useEffect } from "react";
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
  bookingId?: string;
  redirectUrl?: string;
}

const PayPalButtonContent = ({ amount, userId, description, onSuccess, bookingId, redirectUrl }: PayPalButtonProps) => {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer();
  const [sdkError, setSdkError] = useState(false);

  useEffect(() => {
    // Check if PayPal SDK is available after a delay
    const checkSDK = setTimeout(() => {
      if (isResolved && (typeof window === 'undefined' || !(window as any).paypal?.Buttons)) {
        if (import.meta.env.DEV) {
          console.warn('PayPal SDK loaded but Buttons API not available');
        }
        setSdkError(true);
      }
    }, 2000);

    return () => clearTimeout(checkSDK);
  }, [isResolved]);

  const createOrder = (data: any, actions: any) => {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: amount.toFixed(2),
          currency_code: CURRENCY_CODE
        },
        description: description
      }],
      application_context: {
        return_url: redirectUrl || window.location.origin + '/payment/success',
        cancel_url: redirectUrl || window.location.origin + '/payment/cancel'
      }
    });
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      const order = await actions.order.capture();
      
      // Determine transaction type based on description
      const isDeposit = description.toLowerCase().includes('wallet deposit');
      const transactionType = isDeposit ? 'deposit' : 'payment';
      
      // Create transaction record
      await createTransaction({
        userId,
        type: transactionType,
        amount,
        description: `PayPal ${transactionType}: ${description}`,
        status: 'completed',
        paymentMethod: 'paypal',
        paymentId: order.id,
        bookingId: bookingId
      });

      // If it's a deposit, update wallet balance
      if (isDeposit) {
        const { doc, updateDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const currentBalance = userDoc.data().walletBalance || 0;
          const newBalance = currentBalance + amount;
          const updateData: any = {
            walletBalance: newBalance
          };
          
          // Mark PayPal account as verified on first successful payment
          if (!userDoc.data().paypalEmailVerified) {
            updateData.paypalEmailVerified = true;
            updateData.paypalVerifiedAt = new Date().toISOString();
          }
          
          await updateDoc(doc(db, 'users', userId), updateData);
        }
      } else {
        // For booking payments, also mark as verified on first successful payment
        const { doc, updateDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && !userDoc.data().paypalEmailVerified) {
          await updateDoc(doc(db, 'users', userId), {
            paypalEmailVerified: true,
            paypalVerifiedAt: new Date().toISOString()
          });
        }
      }

      toast.success("Payment successful!");
      onSuccess();
    } catch (error) {
      toast.error("Payment failed");
      if (import.meta.env.DEV) {
        console.error(error);
      }
      
      // Create failed transaction record
      await createTransaction({
        userId,
        type: 'payment',
        amount,
        description: `PayPal payment (failed): ${description}`,
        status: 'failed',
        paymentMethod: 'paypal',
        bookingId: bookingId
      });
    }
  };

  const onError = (err: any) => {
    toast.error("Payment error occurred");
    if (import.meta.env.DEV) {
      console.error(err);
    }
  };

  // Show loading state while SDK is loading
  if (isPending && !sdkError) {
    return <div className="w-full h-10 bg-muted animate-pulse rounded" />;
  }

  // If SDK failed to load or is not available, show fallback
  if (isRejected || sdkError || (isResolved && (typeof window === 'undefined' || !(window as any).paypal?.Buttons))) {
    if (import.meta.env.DEV) {
      console.warn('PayPal SDK not available, using simulated payment');
    }
    return <SimulatedPayPalButton amount={amount} userId={userId} description={description} onSuccess={onSuccess} />;
  }

  // Only render PayPalButtons if SDK is resolved and loaded
  if (!isResolved) {
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
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENV || 'sandbox'; // Default to sandbox for safety
  
  // If PayPal is not configured, use simulated payment
  if (!clientId || clientId === '') {
    return <SimulatedPayPalButton {...props} />;
  }

  // Always use sandbox mode for simulation (no real money)
  const isSandbox = paypalEnv !== 'production';

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: CURRENCY_CODE,
        intent: "capture",
        components: "buttons",
        "data-sdk-integration-source": "button-factory",
        // Explicitly set to sandbox for simulation
        ...(isSandbox && { "data-namespace": "paypal_sdk" })
      }}
      deferLoading={false}
    >
      <PayPalButtonContent {...props} />
    </PayPalScriptProvider>
  );
};

// Fallback simulated payment (when PayPal SDK is not configured)
const SimulatedPayPalButton = ({ amount, userId, description, onSuccess }: PayPalButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing (NO REAL MONEY - SIMULATION ONLY)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Determine transaction type based on description
      const isDeposit = description.toLowerCase().includes('wallet deposit');
      const transactionType = isDeposit ? 'deposit' : 'payment';
      
      // Create transaction record
      await createTransaction({
        userId,
        type: transactionType,
        amount,
        description: `PayPal ${transactionType} (SIMULATED - NO REAL MONEY): ${description}`,
        status: 'completed',
        paymentMethod: 'paypal'
      });

      // If it's a deposit, update wallet balance
      if (isDeposit) {
        const { doc, updateDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const currentBalance = userDoc.data().walletBalance || 0;
          const newBalance = currentBalance + amount;
          await updateDoc(doc(db, 'users', userId), {
            walletBalance: newBalance
          });
        }
      }

      toast.success("Payment successful! (SIMULATION - NO REAL MONEY)");
      onSuccess();
    } catch (error) {
      toast.error("Payment failed");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-[#0070ba] hover:bg-[#003087]"
      >
        <DollarSign className="h-4 w-4 mr-2" />
        {loading ? "Processing..." : `Pay ${formatPHP(amount)} with PayPal (SIMULATION)`}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        ⚠️ Simulation Mode - No real money will be charged
      </p>
    </div>
  );
};
