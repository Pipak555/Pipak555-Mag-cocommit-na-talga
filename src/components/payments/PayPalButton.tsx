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
import { processWalletTopUp, getAdminPayPalEmail } from "@/lib/walletService";

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

  const createOrder = async (data: any, actions: any) => {
    try {
      // Determine if this is a deposit (wallet top-up)
      const isDeposit = description.toLowerCase().includes('wallet deposit') || description.toLowerCase().includes('top-up');
      
      // For deposits, get admin PayPal email to set as payee
      // Real money goes to Admin's PayPal account, virtual balance is credited separately
      let payeeEmail: string | null = null;
      if (isDeposit) {
        try {
          console.log('🔍 Retrieving admin PayPal email for deposit...');
          payeeEmail = await getAdminPayPalEmail();
          
          if (!payeeEmail) {
            console.error('❌ CRITICAL: Admin PayPal email not found!');
            console.error('❌ Payment will NOT go to admin account. Please configure admin PayPal email in admin settings.');
            toast.error('Admin PayPal account not configured. Please contact support.');
            throw new Error('Admin PayPal email is required for deposits. Please configure it in admin settings.');
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(payeeEmail)) {
            console.error('❌ CRITICAL: Invalid admin PayPal email format:', payeeEmail);
            toast.error('Invalid admin PayPal email configuration. Please contact support.');
            throw new Error('Invalid admin PayPal email format');
          }
          
          console.log('✅ Admin PayPal email retrieved:', payeeEmail);
        } catch (error: any) {
          console.error('❌ Error getting admin PayPal email:', error);
          // For deposits, we MUST have admin PayPal email - don't continue
          if (isDeposit) {
            toast.error('Cannot process deposit: Admin PayPal account not configured. Please contact support.');
            throw new Error('Admin PayPal email is required for deposits. Error: ' + (error.message || 'Unknown error'));
          }
          // For non-deposits, continue without payee
        }
      }

      // Charge exactly the amount the guest wants to deposit
      // No fees - guest pays exact amount, admin receives exact same amount
      const amountToCharge = Number(amount);
      
      // Validate amount is correct
      if (isNaN(amountToCharge) || amountToCharge <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      console.log('💰 Creating PayPal order:', {
        amount: amountToCharge.toFixed(2),
        isDeposit,
        note: 'Guest pays exact amount, admin receives exact same amount (no fees)'
      });
      
      const orderData: any = {
      purchase_units: [{
        amount: {
          value: amountToCharge.toFixed(2), // Exact amount - no fees
          currency_code: CURRENCY_CODE
        },
        description: description
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
      };

      // For deposits, set admin PayPal email as payee so money goes to Admin's account
      // CRITICAL: This is REQUIRED for deposits - money must go to admin account
      if (isDeposit) {
        if (!payeeEmail) {
          console.error('❌ CRITICAL: Cannot create deposit order without admin PayPal email!');
          toast.error('Cannot process deposit: Admin PayPal account not configured.');
          throw new Error('Admin PayPal email is required for deposits');
        }
        
        orderData.purchase_units[0].payee = {
          email_address: payeeEmail
        };
        
        // Log the order data being sent to PayPal
        console.log('✅ PayPal order created with payee:', {
          payeeEmail,
          amount: amountToCharge.toFixed(2),
          currency: CURRENCY_CODE,
          description,
          fullOrderData: JSON.stringify(orderData, null, 2),
          note: 'Guest pays exact amount, admin receives exact same amount (no fees)'
        });
        
        // Validate the order amount matches what we expect
        const orderAmountValue = parseFloat(orderData.purchase_units[0].amount.value);
        if (Math.abs(orderAmountValue - amountToCharge) > 0.01) {
          console.error('❌ CRITICAL ERROR: Order amount does not match expected amount!', {
            expectedAmount: amountToCharge,
            actualOrderAmount: orderAmountValue,
            difference: Math.abs(orderAmountValue - amountToCharge),
            orderData: orderData.purchase_units[0]
          });
          throw new Error(`Order amount mismatch: Expected ${amountToCharge}, but order has ${orderAmountValue}`);
        }
        
        console.log('✅ Amount validation passed:', {
          amount: amountToCharge.toFixed(2),
          orderAmount: orderAmountValue.toFixed(2),
          match: Math.abs(orderAmountValue - amountToCharge) <= 0.01,
          note: 'Guest pays exact amount, admin receives exact same amount (no fees)'
        });
      }

      console.log('📤 Creating PayPal order:', {
        isDeposit,
        amount: amountToCharge.toFixed(2),
        payeeEmail: payeeEmail || 'N/A (not a deposit)',
        orderData: JSON.stringify(orderData, null, 2)
      });

      const order = await actions.order.create(orderData);
      
      // Verify the order response matches what we sent
      const orderResponseAmount = parseFloat(order.purchase_units?.[0]?.amount?.value || '0');
      console.log('✅ PayPal order created successfully:', {
        orderId: order.id,
        status: order.status,
        payeeEmail: orderData.purchase_units[0].payee?.email_address || 'N/A',
        amount: amountToCharge.toFixed(2),
        orderResponseAmount: orderResponseAmount.toFixed(2),
        amountMatch: Math.abs(orderResponseAmount - amountToCharge) <= 0.01,
        fullOrderResponse: JSON.stringify(order, null, 2),
        note: 'Guest pays exact amount, admin receives exact same amount (no fees)'
      });
      
      // Warn if PayPal's response doesn't match what we sent
      if (Math.abs(orderResponseAmount - amountToCharge) > 0.01) {
        console.warn('⚠️ WARNING: PayPal order response amount does not match expected amount!', {
          expectedAmount: amountToCharge,
          orderResponseAmount: orderResponseAmount,
          difference: Math.abs(orderResponseAmount - amountToCharge),
          note: 'This may indicate a PayPal configuration issue'
        });
      }
      
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
      const isDeposit = description.toLowerCase().includes('wallet deposit') || description.toLowerCase().includes('top-up');
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
      
      // Handle wallet top-up (deposit) - Client-side implementation
      if (isDeposit) {
        try {
          // Extract actual amounts from PayPal order to ensure accuracy
          // This is critical: we must use the actual PayPal amounts, not the form amount
          const purchaseUnit = order.purchase_units?.[0];
          const capture = purchaseUnit?.payments?.captures?.[0];
          const breakdown = capture?.seller_receivable_breakdown;
          
          // DEBUG: Log full PayPal response to understand structure
          console.log('🔍 DEBUG PayPal Order Structure:', {
            orderId: order.id,
            orderStatus: order.status,
            purchaseUnit: {
              amount: purchaseUnit?.amount,
              payee: purchaseUnit?.payee,
              payments: purchaseUnit?.payments ? {
                captures: purchaseUnit.payments.captures?.map((c: any) => ({
                  id: c.id,
                  status: c.status,
                  amount: c.amount,
                  seller_receivable_breakdown: c.seller_receivable_breakdown,
                  final_capture: c.final_capture
                }))
              } : null
            },
            fullOrder: JSON.stringify(order, null, 2)
          });
          
          // No fees - guest pays exact amount, admin receives exact same amount
          const depositAmount = Number(amount); // What guest wants to deposit
          
          // Get actual amount from PayPal response
          const guestPaidAmount = parseFloat(capture?.amount?.value || purchaseUnit?.amount?.value || '0');
          
          // Wallet is credited with the exact deposit amount
          const walletCreditAmount = depositAmount;
          
          // VALIDATION: Ensure amounts are correct
          if (isNaN(depositAmount) || depositAmount <= 0) {
            console.error('❌ CRITICAL: Invalid amount detected!', { 
              amount, 
              depositAmount, 
              guestPaidAmount,
              walletCreditAmount 
            });
            throw new Error('Invalid deposit amount - amount must be a positive number');
          }
          
          console.log('✅ Processing deposit (no fees):', {
            depositAmount: depositAmount.toFixed(2), // What guest wants to deposit
            guestPaidAmount: guestPaidAmount.toFixed(2), // What guest actually paid
            walletCreditAmount: walletCreditAmount.toFixed(2), // Wallet credited with exact amount
            note: 'No fees - guest pays exact amount, admin receives exact same amount'
          });
          
          // Log PayPal's breakdown for reference (should show no fees)
          // CRITICAL: We extract PayPal's breakdown for logging only - we NEVER use PayPal's net_amount
          // We always use the original depositAmount to ensure admin receives the full amount
          let paypalNetFromBreakdown: number | null = null;
          if (breakdown) {
            const paypalGross = parseFloat(breakdown.gross_amount?.value || '0');
            paypalNetFromBreakdown = parseFloat(breakdown.net_amount?.value || '0');
            const paypalFee = parseFloat(breakdown.paypal_fee?.value || '0');
            
            console.log('📊 PayPal Breakdown (for reference only - NOT used for calculations):', {
              paypalGrossAmount: paypalGross.toFixed(2),
              paypalNetAmount: paypalNetFromBreakdown.toFixed(2),
              paypalFee: paypalFee.toFixed(2),
              depositAmount: depositAmount.toFixed(2),
              note: 'CRITICAL: We use depositAmount for netAmount, NOT PayPal breakdown.net_amount'
            });
            
            // Warn if PayPal shows fees (shouldn't happen in sandbox)
            if (paypalFee > 0.01) {
              console.warn(`⚠️ WARNING: PayPal shows fees (₱${paypalFee.toFixed(2)}) but system expects no fees!`, {
                depositAmount: depositAmount,
                paypalFee: paypalFee,
                paypalNet: paypalNetFromBreakdown,
                note: 'This may indicate PayPal sandbox is charging fees unexpectedly. System will use depositAmount instead.'
              });
            }
            
            // CRITICAL: Warn if PayPal's net_amount differs from deposit amount
            // This ensures we catch any cases where PayPal might be deducting fees
            if (Math.abs(paypalNetFromBreakdown - depositAmount) > 0.01) {
              console.error(`❌ CRITICAL WARNING: PayPal breakdown.net_amount (₱${paypalNetFromBreakdown.toFixed(2)}) differs from deposit amount (₱${depositAmount.toFixed(2)})!`, {
                depositAmount: depositAmount,
                paypalNetAmount: paypalNetFromBreakdown,
                difference: Math.abs(paypalNetFromBreakdown - depositAmount),
                note: 'CRITICAL: System will use depositAmount (₱' + depositAmount.toFixed(2) + ') for netAmount to ensure admin receives full payment. PayPal breakdown.net_amount is IGNORED.'
              });
            }
          }
          
          // CRITICAL VALIDATION: Ensure guestPaidAmount matches depositAmount
          // If they don't match, something went wrong with the PayPal order
          if (Math.abs(guestPaidAmount - depositAmount) > 0.01) {
            console.error('❌ CRITICAL ERROR: Guest paid amount does not match deposit amount!', {
              depositAmount: depositAmount,
              guestPaidAmount: guestPaidAmount,
              difference: Math.abs(guestPaidAmount - depositAmount),
              note: 'This indicates the PayPal order amount was incorrect'
            });
            throw new Error(`Payment amount mismatch: Expected ₱${depositAmount.toFixed(2)}, but PayPal shows ₱${guestPaidAmount.toFixed(2)}. Please contact support.`);
          }
          
          console.log('✅ Final amounts for processing:', {
            depositAmount: depositAmount.toFixed(2),
            guestPaidAmount: guestPaidAmount.toFixed(2),
            walletCreditAmount: walletCreditAmount.toFixed(2),
            paypalNetFromBreakdown: paypalNetFromBreakdown !== null ? paypalNetFromBreakdown.toFixed(2) : 'N/A',
            note: 'CRITICAL: Using depositAmount for all calculations. PayPal breakdown.net_amount is IGNORED.',
            adminWillReceive: depositAmount.toFixed(2) + ' (full amount, no deductions)'
          });
          
          // Verify the order was actually completed and captured
          if (!capture || capture.status !== 'COMPLETED') {
            throw new Error('Payment capture not completed. Please try again.');
          }
          
          // CRITICAL: Verify payee email matches admin PayPal email
          // This ensures money is going to the correct admin account
          const payeeEmail = purchaseUnit?.payee?.email_address;
          
          if (isDeposit) {
            if (!payeeEmail) {
              console.error('❌ CRITICAL: Deposit order has no payee email! Money may not reach admin account.');
              console.error('❌ Order details:', {
                orderId: order.id,
                purchaseUnit: purchaseUnit,
                warning: 'Payment may have gone to merchant account instead of admin account'
              });
              toast.error('Warning: Payment may not have reached admin account. Please verify.');
            } else {
              try {
                const { getAdminPayPalEmail } = await import('@/lib/walletService');
                const adminPayPalEmail = await getAdminPayPalEmail();
                
                if (adminPayPalEmail) {
                  if (payeeEmail.toLowerCase() !== adminPayPalEmail.toLowerCase()) {
                    console.error(`❌ CRITICAL: Payee email mismatch!`, {
                      expected: adminPayPalEmail,
                      actual: payeeEmail,
                      orderId: order.id,
                      warning: 'Money may have gone to wrong account!'
                    });
                    toast.error('Warning: Payment may have gone to incorrect account. Please verify.');
                  } else {
                    console.log('✅ Payee email verified:', {
                      payeeEmail,
                      adminPayPalEmail,
                      match: true,
                      note: 'Payment will reach correct admin account'
                    });
                  }
                } else {
                  console.warn('⚠️ Cannot verify payee: Admin PayPal email not found in system');
                }
              } catch (error) {
                console.error('❌ Error verifying payee email:', error);
                // Log but don't block - payment already processed
              }
            }
          }
          
          // Log deposit details before processing
          const actualPayeeEmail = purchaseUnit?.payee?.email_address;
          console.log('💰 Processing wallet deposit:', {
            orderId: order.id,
            captureId: capture.id,
            depositAmount: depositAmount.toFixed(2),
            guestPaidAmount: guestPaidAmount.toFixed(2),
            walletCreditAmount: walletCreditAmount.toFixed(2),
            paypalNetFromBreakdown: paypalNetFromBreakdown !== null ? paypalNetFromBreakdown.toFixed(2) : 'N/A',
            payeeEmailFromOrder: actualPayeeEmail,
            userId,
            isDeposit,
            note: 'CRITICAL: Admin will receive ₱' + depositAmount.toFixed(2) + ' (full amount, no deductions). PayPal breakdown.net_amount is IGNORED.',
            warning: isDeposit && !actualPayeeEmail ? '⚠️ CRITICAL: No payee email in order - payment may not reach admin!' : 'OK'
          });

          // Process wallet top-up
          // CRITICAL: No fees - all amounts are the same:
          // - Guest pays: depositAmount
          // - Admin receives: depositAmount (exact same) - PayPal breakdown.net_amount is IGNORED
          // - Wallet credited: depositAmount (exact same)
          // We explicitly pass depositAmount as netAmount to ensure admin receives the full amount
          // We NEVER use PayPal's breakdown.net_amount value - even if PayPal shows fees, we ignore them
          // CRITICAL FIX: Always use depositAmount for netAmount, completely ignore PayPal's breakdown.net_amount
          const result = await processWalletTopUp(
            order.id,
            walletCreditAmount, // Exact deposit amount (no fees)
            description,
            userId,
            {
              grossAmount: depositAmount, // What guest paid (always equals depositAmount - no fees)
              paypalFee: 0, // No fees - explicitly set to 0 (ignore PayPal's fee if shown)
              netAmount: depositAmount, // CRITICAL: Admin receives exact same amount (no fees deducted). This is ALWAYS depositAmount, NEVER PayPal breakdown.net_amount
              captureId: capture.id,
              payeeEmail: actualPayeeEmail || null
            }
          );
          
          // Log successful deposit processing
          console.log('✅ Wallet deposit processed successfully:', {
            orderId: order.id,
            transactionId: result.transactionId,
            depositAmount: depositAmount.toFixed(2),
            guestPaidAmount: guestPaidAmount.toFixed(2),
            walletCredited: walletCreditAmount.toFixed(2),
            newBalance: result.newBalance,
            payeeEmail: actualPayeeEmail,
            note: actualPayeeEmail ? 
              `Guest paid ₱${guestPaidAmount.toFixed(2)}, admin receives ₱${depositAmount.toFixed(2)} (no fees)` : 
              '⚠️ WARNING: No payee email - verify admin received payment!'
          });
          
          // Always log in development, and also log in production for debugging
          console.log('✅ Wallet top-up processed:', {
            depositAmount: depositAmount.toFixed(2),
            guestPaidAmount: guestPaidAmount.toFixed(2),
            walletCredited: walletCreditAmount.toFixed(2),
            orderId: order.id,
            captureId: capture.id,
            transactionId: result.transactionId,
            newBalance: result.newBalance,
            payeeEmail: purchaseUnit?.payee?.email_address,
            hasBreakdown: !!breakdown,
            note: `Guest paid ₱${guestPaidAmount.toFixed(2)}, admin receives ₱${depositAmount.toFixed(2)}, wallet credited ₱${walletCreditAmount.toFixed(2)} (no fees)`
          });
          
          toast.success(result.message || "Top-up successful! Your wallet balance has been updated.");
          onSuccess();
          return;
        } catch (topUpError: any) {
          console.error('❌ Error processing wallet top-up:', topUpError);
          toast.error(topUpError.message || 'Payment successful but failed to credit wallet. Please contact support.');
          // Payment was successful, but wallet credit failed - user should contact support
          throw topUpError;
        }
      }
      
      // For booking payments, create transaction record and mark PayPal as verified
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
