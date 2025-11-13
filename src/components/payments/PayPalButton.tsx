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
  useRedirectFlow?: boolean; // If true, uses full-page redirect instead of popup
}

const PayPalButtonContent = ({ amount, userId, description, onSuccess, bookingId, redirectUrl, useRedirectFlow = false }: PayPalButtonProps) => {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer();
  const [sdkError, setSdkError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [redirectFlowFailed, setRedirectFlowFailed] = useState(false);

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

    // Monitor for PayPal popup and center it
    const observer = new MutationObserver(() => {
      // Find PayPal popup/iframe elements - multiple selectors for better coverage
      const paypalIframes = document.querySelectorAll('iframe[src*="paypal.com"], iframe[src*="checkoutnow"], iframe[id*="paypal"]');
      const paypalContainers = document.querySelectorAll(
        '[id*="paypal"], [class*="paypal"], [id*="zoid-paypal"], [class*="zoid-paypal"], [id*="paypal-button"], [class*="paypal-button"]'
      );
      const paypalOverlays = document.querySelectorAll('[id*="overlay"], [class*="overlay"], [id*="modal"], [class*="modal"]');
      
      // Center PayPal iframes (checkout popups)
      paypalIframes.forEach((iframe: any) => {
        if (iframe.src && (iframe.src.includes('checkoutnow') || iframe.src.includes('paypal.com'))) {
          // Center the iframe's parent container
          let parent = iframe.parentElement;
          let attempts = 0;
          // Traverse up to find the actual popup container (usually 2-3 levels up)
          while (parent && attempts < 5) {
            const computedStyle = window.getComputedStyle(parent);
            if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute' || 
                parent.id?.includes('paypal') || parent.className?.includes('paypal')) {
              parent.style.cssText = `
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              z-index: 99999 !important;
                margin: 0 !important;
            `;
              break;
            }
            parent = parent.parentElement;
            attempts++;
          }
          
          // Style the iframe itself
          iframe.style.cssText = `
            border-radius: 0.75rem !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
            max-width: 90vw !important;
            max-height: 90vh !important;
          `;
        }
      });

      // Center PayPal containers
      paypalContainers.forEach((container: any) => {
        const computedStyle = window.getComputedStyle(container);
        if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
          container.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 99999 !important;
            margin: 0 !important;
          `;
        }
      });

      // Center PayPal overlays/modals
      paypalOverlays.forEach((overlay: any) => {
        const computedStyle = window.getComputedStyle(overlay);
        const hasPayPalContent = overlay.querySelector('iframe[src*="paypal.com"]') || 
                                  overlay.id?.includes('paypal') || 
                                  overlay.className?.includes('paypal');
        if (hasPayPalContent && (computedStyle.position === 'fixed' || computedStyle.position === 'absolute')) {
          overlay.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 99999 !important;
            margin: 0 !important;
          `;
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      clearTimeout(checkSDK);
      observer.disconnect();
    };
  }, [isResolved]);

  // Handle redirect flow (full-page redirect to PayPal)
  // This uses a hidden PayPal button to create the order, then extracts the approval URL
  const handleRedirectFlow = async () => {
    if (!isResolved || !(window as any).paypal) {
      toast.error("PayPal SDK not ready. Please try again.");
      return;
    }

    setProcessing(true);
    try {
      const paypal = (window as any).paypal;
      
      // Check if Buttons API is available
      if (!paypal.Buttons) {
        throw new Error('PayPal Buttons API not available');
      }
      
      // Create order using PayPal SDK's order API
      // We need to use the SDK's order creation which requires the actions object
      // Since we can't access actions directly, we'll create a temporary button
      const tempContainer = document.createElement('div');
      tempContainer.id = 'paypal-temp-button-container';
      tempContainer.style.cssText = 'position: absolute; left: -9999px; opacity: 0; pointer-events: none;';
      document.body.appendChild(tempContainer);

      return new Promise<void>((resolve, reject) => {
        let buttonRendered = false;
        let timeoutId: NodeJS.Timeout;
        
        // Set a timeout to prevent hanging
        timeoutId = setTimeout(() => {
          if (!buttonRendered) {
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer);
            }
            setProcessing(false);
            reject(new Error('PayPal button creation timed out. Please try again.'));
          }
        }, 10000); // 10 second timeout

        try {
        paypal.Buttons({
          createOrder: (data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: amount.toFixed(2),
                  currency_code: CURRENCY_CODE
                },
                description: description
              }],
              application_context: {
                return_url: redirectUrl || `${window.location.origin}/payment/success`,
                cancel_url: `${window.location.origin}/payment/cancel`,
                brand_name: "Mojo Dojo Casa House",
                locale: "en-PH",
                shipping_preference: "NO_SHIPPING"
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            // This won't be called in redirect flow, but we need it for the button to work
            // The actual processing happens after redirect
          },
          onError: (err: any) => {
              clearTimeout(timeoutId);
              if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
              }
              setProcessing(false);
            reject(err);
          }
        }).render(tempContainer).then((buttonInstance: any) => {
            buttonRendered = true;
            clearTimeout(timeoutId);
            
            // Wait a bit for the button to be fully rendered in the DOM
            setTimeout(() => {
              // Try multiple selectors to find the button
              const button = tempContainer.querySelector('button') || 
                           tempContainer.querySelector('[role="button"]') ||
                           tempContainer.querySelector('a[href*="paypal"]');
              
              if (button) {
                // Trigger the button click programmatically
                (button as HTMLElement).click();
                
                // Wait a bit for the order to be created and popup/redirect to start
                setTimeout(() => {
                  // Clean up the temporary container
                  if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                  }
                  setProcessing(false);
                  resolve();
                }, 1000);
              } else {
                // Button not found, try to find any clickable element
                const clickableElements = tempContainer.querySelectorAll('button, a, [role="button"], [onclick]');
                if (clickableElements.length > 0) {
                  (clickableElements[0] as HTMLElement).click();
                  setTimeout(() => {
                    if (document.body.contains(tempContainer)) {
                      document.body.removeChild(tempContainer);
                    }
                    setProcessing(false);
                    resolve();
                  }, 1000);
                } else {
                  // Fallback: use regular PayPal button flow instead
                  if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                  }
                  setProcessing(false);
                  toast.error("Could not initiate redirect flow. Please use the PayPal button below.");
                  reject(new Error('PayPal button element not found. Please use the standard PayPal button.'));
                }
              }
            }, 500); // Wait 500ms for button to render
          }).catch((err: any) => {
            clearTimeout(timeoutId);
            buttonRendered = true;
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer);
            }
              setProcessing(false);
            console.error('PayPal button render error:', err);
            toast.error("Failed to create PayPal button. Please try again or use the standard button.");
            reject(err);
          });
        } catch (renderError: any) {
          clearTimeout(timeoutId);
          if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
          }
          setProcessing(false);
          console.error('PayPal button creation error:', renderError);
          toast.error("Failed to initialize PayPal. Please try again.");
          reject(renderError);
        }
      });
    } catch (error: any) {
      console.error('Redirect flow error:', error);
      toast.error(error?.message || "Failed to initiate payment. Please try again.");
      setProcessing(false);
      throw error;
    }
  };

  const createOrder = async (data: any, actions: any) => {
    try {
      // In sandbox mode, we can't easily check balance client-side
      // PayPal will handle insufficient funds on their end
      // The order creation will succeed, but capture will fail if insufficient funds
      const order = await actions.order.create({
      purchase_units: [{
        amount: {
          value: amount.toFixed(2),
          currency_code: CURRENCY_CODE
        },
        description: description
        // NOTE: We intentionally do NOT include any payer information here
        // This ensures PayPal shows the login page first, not saved payment methods
      }],
      application_context: {
        return_url: redirectUrl || window.location.origin + '/payment/success',
        cancel_url: window.location.origin + '/payment/cancel',
        brand_name: "Mojo Dojo Casa House",
        locale: "en-PH",
        shipping_preference: "NO_SHIPPING", // For digital services, no shipping needed
        // CRITICAL: Force PayPal to show LOGIN page first, not billing page with saved payment methods
        // This ensures users must log in with their own account before seeing any payment options
        landing_page: "LOGIN", // Forces login page - user must log in first (no saved payment methods shown)
        // Force immediate payment (no saved payment methods)
        payment_method: {
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED" // Enforce immediate payment
        },
        // Force user to explicitly confirm payment (don't auto-select saved accounts)
        user_action: "PAY_NOW" // Requires explicit payment confirmation
      }
      // NOTE: We intentionally do NOT include any payer object here
      // This prevents PayPal from pre-filling account information
    });
      return order;
    } catch (error: any) {
      console.error('Error creating PayPal order:', error);
      // Check if it's an insufficient funds error during order creation
      if (error?.message?.includes('INSUFFICIENT_FUNDS') || error?.details?.[0]?.issue === 'INSUFFICIENT_FUNDS') {
        toast.error('Payment failed: Insufficient funds in your PayPal account. Please add funds and try again.');
        throw error;
      }
      throw error;
    }
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      // Attempt to capture the payment
      // This is where PayPal will actually check for sufficient funds
      let order;
      try {
        order = await actions.order.capture();
      } catch (captureError: any) {
        // PayPal capture failed - likely insufficient funds
        console.error('PayPal capture error:', captureError);
        const errorMsg = captureError?.message || captureError?.toString() || '';
        
        if (
          errorMsg.includes('INSUFFICIENT_FUNDS') ||
          errorMsg.includes('insufficient') ||
          errorMsg.includes('INSTRUMENT_DECLINED') ||
          errorMsg.includes('declined') ||
          captureError?.details?.[0]?.issue === 'INSUFFICIENT_FUNDS' ||
          captureError?.details?.[0]?.issue === 'INSTRUMENT_DECLINED'
        ) {
          const errorMessage = 'Payment failed: Insufficient funds in your PayPal account. Please add funds to your PayPal account and try again.';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Re-throw other errors
        throw captureError;
      }
      
      // Verify the order was captured successfully
      if (!order || order.status !== 'COMPLETED') {
        // Check for insufficient funds or payment declined
        const orderStatus = order?.status;
        const purchaseUnit = order?.purchase_units?.[0];
        const paymentStatus = purchaseUnit?.payments?.captures?.[0]?.status;
        
        if (
          orderStatus === 'PAYER_ACTION_REQUIRED' || 
          orderStatus === 'VOIDED' ||
          orderStatus === 'COMPLETED' && paymentStatus === 'DECLINED' ||
          purchaseUnit?.payments?.captures?.[0]?.status === 'DECLINED'
        ) {
          const errorMsg = 'Payment failed: Insufficient funds or payment declined. Please add funds to your PayPal account and try again.';
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Check for other failure statuses
        if (orderStatus && orderStatus !== 'COMPLETED') {
          const errorMsg = `Payment failed with status: ${orderStatus}. Please try again or contact support.`;
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        throw new Error('Payment was not completed successfully');
      }
      
      // Additional check: Verify the capture was successful
      const purchaseUnit = order.purchase_units?.[0];
      const capture = purchaseUnit?.payments?.captures?.[0];
      if (capture && capture.status !== 'COMPLETED') {
        if (capture.status === 'DECLINED' || capture.status === 'FAILED') {
          const errorMsg = 'Payment failed: Insufficient funds or payment declined. Please add funds to your PayPal account and try again.';
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
        const errorMsg = `Payment capture failed with status: ${capture.status}`;
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Determine transaction type based on description
      const isDeposit = description.toLowerCase().includes('wallet deposit');
      const isSubscription = description.toLowerCase().includes('host subscription') || description.toLowerCase().includes('subscription');
      const transactionType = isDeposit ? 'deposit' : 'payment';
      
      // Handle subscription payments
      if (isSubscription) {
        try {
          const { processSubscriptionPayment } = await import('@/lib/billingService');
          // Extract plan ID from description - format: "... - planId=active-host-yearly"
          // Match planId= followed by word characters, hyphens, and underscores until whitespace or end
          const planIdMatch = description.match(/planId=([^\s]+)/);
          const planId = planIdMatch ? planIdMatch[1] : 'active-host-monthly';
          
          console.log('Processing subscription payment:', { userId, planId, orderId: order.id });
          const result = await processSubscriptionPayment(userId, planId, order.id, order.id);
          console.log('✅ Subscription payment processed successfully');
          
          if (result.isScheduled) {
            toast.success("Payment successful! Your new plan will start when your current subscription expires.");
          } else {
          toast.success("Payment successful! Your subscription is now active.");
          }
          
          // Call onSuccess callback which will handle navigation
          onSuccess();
          return;
        } catch (subscriptionError: any) {
          console.error('❌ Error processing subscription:', subscriptionError);
          toast.error('Payment received but subscription activation failed. Please contact support.');
          // Still create transaction record even if subscription processing fails
        }
      }
      
      // Create transaction record
      const transactionData: any = {
        userId,
        type: transactionType,
        amount,
        description: `PayPal ${transactionType}: ${description}`,
        status: 'completed',
        paymentMethod: 'paypal',
        paymentId: order.id
      };
      
      // Only include bookingId if it's provided (not for deposits)
      if (bookingId) {
        transactionData.bookingId = bookingId;
      }
      
      await createTransaction(transactionData);

      // If it's a deposit, update wallet balance
      if (isDeposit) {
        try {
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
            
            if (import.meta.env.DEV) {
              console.log('✅ Deposit successful:', {
                amount,
                previousBalance: currentBalance,
                newBalance,
                orderId: order.id
              });
            }
          } else {
            throw new Error('User document not found');
          }
        } catch (depositError: any) {
          console.error('❌ Error updating wallet balance:', depositError);
          toast.error('Payment successful but failed to update wallet. Please contact support.');
          // Still show success since payment went through
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
      const failedTransactionData: any = {
        userId,
        type: 'payment',
        amount,
        description: `PayPal payment (failed): ${description}`,
        status: 'failed',
        paymentMethod: 'paypal'
      };
      
      // Only include bookingId if it's provided
      if (bookingId) {
        failedTransactionData.bookingId = bookingId;
      }
      
      await createTransaction(failedTransactionData);
    }
  };

  const onError = (err: any) => {
    console.error('PayPal payment error:', err);
    
    // Check for insufficient funds or payment declined errors
    const errorMessage = err?.message || err?.toString() || '';
    const errorDetails = err?.details?.[0] || {};
    
    // PayPal error codes for insufficient funds
    if (
      errorMessage.includes('INSUFFICIENT_FUNDS') ||
      errorMessage.includes('insufficient') ||
      errorMessage.includes('INSTRUMENT_DECLINED') ||
      errorMessage.includes('declined') ||
      errorDetails.issue === 'INSUFFICIENT_FUNDS' ||
      errorDetails.issue === 'INSTRUMENT_DECLINED' ||
      err?.name === 'INSUFFICIENT_FUNDS'
    ) {
      toast.error('Payment failed: Insufficient funds in your PayPal account. Please add funds and try again.');
    } else if (errorMessage.includes('PAYER_ACTION_REQUIRED') || errorMessage.includes('action required')) {
      toast.error('Payment failed: Action required. Please check your PayPal account and try again.');
    } else {
      toast.error(err?.message || 'Payment error occurred. Please try again.');
    }
    
    if (import.meta.env.DEV) {
      console.error('Full PayPal error details:', err);
    }
  };

  // Show loading state while SDK is loading
  if (isPending && !sdkError) {
    return <div className="w-full h-10 bg-muted animate-pulse rounded" />;
  }

  // If SDK failed to load or is not available, show fallback
  if (isRejected || sdkError || (isResolved && (typeof window === 'undefined' || !(window as any).paypal?.Buttons))) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ PayPal SDK not available, using simulated payment');
      console.warn('💡 This usually means:');
      console.warn('   1. PayPal Client ID is missing or invalid in .env file');
      console.warn('   2. Network/CORS issue preventing SDK from loading');
      console.warn('   3. PayPal SDK script failed to load (check console for 400 errors)');
    }
    return (
      <div className="space-y-2">
        <SimulatedPayPalButton amount={amount} userId={userId} description={description} onSuccess={onSuccess} />
        <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
          ⚠️ PayPal SDK not loaded - using simulation mode. Check console for details.
        </p>
      </div>
    );
  }

  // Only render PayPalButtons if SDK is resolved and loaded
  if (!isResolved) {
    return <div className="w-full h-10 bg-muted animate-pulse rounded" />;
  }

  // Use redirect flow if requested (avoids popup issues)
  // Note: Redirect flow is complex and may not work in all browsers
  // If it fails, we'll fall back to the regular PayPal button
  if (useRedirectFlow) {
    const handleRedirectClick = async () => {
      try {
        await handleRedirectFlow();
      } catch (error: any) {
        // Error is already handled in handleRedirectFlow with toast messages
        // Fall back to regular button if redirect flow fails
        if (import.meta.env.DEV) {
          console.warn('Redirect flow failed, falling back to regular PayPal button:', error);
        }
        setRedirectFlowFailed(true);
      }
    };

    // If redirect flow failed, show regular button instead
    if (redirectFlowFailed) {
      return (
        <div className="w-full">
          <div className="flex justify-center">
            <div className="paypal-button-wrapper max-w-md w-full">
            <PayPalButtons
              createOrder={createOrder}
              onApprove={onApprove}
              onError={onError}
              style={{ 
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "paypal",
                height: 50
              }}
            />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Using standard PayPal checkout
          </p>
        </div>
      );
    }

    return (
      <div className="w-full">
        <Button
          onClick={handleRedirectClick}
          disabled={processing || !isResolved}
          className="w-full h-12 bg-[#FFC439] hover:bg-[#FFB300] text-[#003087] font-semibold"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#003087] mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.174 1.351 1.05 3.3.93 4.855v.006c-.015.115-.03.23-.043.344-.107.947-.212 1.84-.174 2.63.053 1.1.534 1.895 1.424 2.31.896.42 2.077.512 3.513.512h1.42c.96 0 1.72.64 1.982 1.577l.04.15c.12.47.18.96.18 1.45 0 2.85-2.33 5.17-5.2 5.17h-2.13c-1.05 0-1.95-.74-2.16-1.77l-.02-.1-.04-.2-.05-.25c-.1-.5-.2-1.05-.35-1.53-.15-.48-.35-.9-.6-1.25-.25-.35-.55-.6-.9-.75-.35-.15-.75-.2-1.2-.2h-2.1c-.5 0-.95.15-1.35.45-.4.3-.7.7-.9 1.2l-1.45 4.1c-.15.5-.5.9-1 1.15-.5.25-1.05.3-1.6.2z"/>
              </svg>
              Pay with PayPal
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          You will be redirected to PayPal's secure checkout
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <div className="paypal-button-wrapper max-w-md w-full">
        <PayPalButtons
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          style={{ 
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 50
          }}
        />
        </div>
      </div>
    </div>
  );
};

export const PayPalButton = (props: PayPalButtonProps) => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENV || 'sandbox'; // Default to sandbox for safety
  
  // If PayPal is not configured, use simulated payment
  if (!clientId || clientId === '' || clientId === 'your_paypal_client_id') {
    if (import.meta.env.DEV) {
      console.warn('⚠️ PayPal Client ID not configured. Using simulated payment mode.');
      console.warn('💡 To enable real PayPal payments, add VITE_PAYPAL_CLIENT_ID to your .env file');
    }
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
        // Locale settings for better popup appearance
        locale: "en_PH", // Philippines locale
        // Disable saved payment methods to force manual login
        "disable-funding": "credit,card,venmo,paylater",
        // Only enable PayPal (forces users to log in with their own account)
        "enable-funding": "paypal",
        // Use correct PayPal environment
        ...(isSandbox ? {} : { "buyer-country": "PH" })
      }}
      deferLoading={false}
    >
      <PayPalButtonContent {...props} />
    </PayPalScriptProvider>
  );
};

// Fallback simulated payment (when PayPal SDK is not configured)
const SimulatedPayPalButton = ({ amount, userId, description, onSuccess, bookingId }: PayPalButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing (NO REAL MONEY - SIMULATION ONLY)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Determine transaction type based on description
      const isDeposit = description.toLowerCase().includes('wallet deposit');
      const isSubscription = description.toLowerCase().includes('host subscription') || description.toLowerCase().includes('subscription');
      const transactionType = isDeposit ? 'deposit' : 'payment';
      
      // Handle subscription payments (SIMULATED)
      if (isSubscription) {
        try {
          const { processSubscriptionPayment } = await import('@/lib/billingService');
          // Extract plan ID from description - format: "... - planId=active-host-yearly"
          const planIdMatch = description.match(/planId=([^\s]+)/);
          const planId = planIdMatch ? planIdMatch[1] : 'active-host-monthly';
          
          // Generate a simulated payment ID
          const simulatedPaymentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('Processing SIMULATED subscription payment:', { userId, planId, paymentId: simulatedPaymentId });
          await processSubscriptionPayment(userId, planId, simulatedPaymentId, simulatedPaymentId);
          console.log('✅ SIMULATED subscription payment processed successfully');
          toast.success("Payment successful! (SIMULATION - NO REAL MONEY) Your subscription is now active.");
          onSuccess();
          return;
        } catch (subscriptionError: any) {
          console.error('❌ Error processing SIMULATED subscription:', subscriptionError);
          toast.error('Simulated payment received but subscription activation failed. Please contact support.');
          // Continue to create transaction record even if subscription processing fails
        }
      }
      
      // Create transaction record
      const transactionData: any = {
        userId,
        type: transactionType,
        amount,
        description: `PayPal ${transactionType} (SIMULATED - NO REAL MONEY): ${description}`,
        status: 'completed',
        paymentMethod: 'paypal'
      };
      
      // Only include bookingId if it's provided (not for deposits)
      if (bookingId) {
        transactionData.bookingId = bookingId;
      }
      
      await createTransaction(transactionData);

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
