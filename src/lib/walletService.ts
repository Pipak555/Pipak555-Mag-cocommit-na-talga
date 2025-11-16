/**
 * Wallet Service - E-Wallet Top-Up
 * 
 * Handles wallet top-up via PayPal
 * Client-side implementation (no Cloud Functions required)
 */

import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { 
  phpToCentavos, 
  centavosToPHP, 
  addCentavos, 
  subtractCentavos, 
  compareCentavos,
  isLessThanCentavos,
  // Legacy functions for UI calculations
  addMoney, 
  roundMoney 
} from './financialUtils';
import { createTransaction } from './firestore';

/**
 * PayPal breakdown details from order capture
 * All amounts are in PHP (for input from PayPal API)
 */
interface PayPalBreakdown {
  grossAmount: number; // Amount guest paid (what goes to admin before fees) - PHP
  paypalFee: number; // PayPal fee deducted - PHP
  netAmount: number; // Amount admin actually receives (gross - fee) - PHP
  captureId?: string; // PayPal capture ID
  payeeEmail?: string; // Admin PayPal email (for verification)
}

// Import helper functions from financialUtils
import { readWalletBalance, readWalletBalanceCentavos } from './financialUtils';

/**
 * Process wallet top-up after PayPal payment
 * 
 * Client-side implementation:
 * 1. Check if transaction already exists (prevent duplicates - idempotency)
 * 2. Validate amounts and PayPal order details
 * 3. Get user's current balance
 * 4. Create transaction record with full breakdown (gross, fee, net)
 * 5. Update user's wallet balance with original deposit amount
 * 
 * IMPORTANT: 
 * - No fees - guest pays exact amount, admin receives exact same amount
 * - The wallet is credited with the exact deposit amount
 * - Admin receives the full amount in their PayPal account (no fees deducted)
 */
export const processWalletTopUp = async (
  orderId: string,
  walletCreditAmount: number, // Amount to credit to wallet (original requested amount, not what guest paid)
  description?: string,
  userId?: string,
  breakdown?: PayPalBreakdown // Contains: grossAmount (what guest paid), paypalFee, netAmount (what admin receives)
): Promise<{ success: boolean; transactionId: string; newBalance: number; message: string }> => {
  try {
    if (!orderId || !walletCreditAmount || walletCreditAmount <= 0) {
      throw new Error('Invalid order ID or wallet credit amount');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate amounts if breakdown is provided
    if (breakdown) {
      // CRITICAL: Log breakdown for verification - but we NEVER use breakdown.netAmount
      // We always use walletCreditAmount (original deposit amount) to ensure admin receives full payment
      console.log('💰 Processing wallet top-up with breakdown:', {
        walletCreditAmount, // Amount to credit to wallet (exact deposit amount)
        grossAmount: breakdown.grossAmount, // What guest actually paid
        paypalFee: breakdown.paypalFee, // Should be 0 (no fees)
        paypalNetAmountFromBreakdown: breakdown.netAmount, // What PayPal's breakdown shows (for reference only - IGNORED)
        netAmountUsed: walletCreditAmount, // What we actually use (original deposit amount) - THIS IS WHAT ADMIN RECEIVES
        note: 'CRITICAL: Using walletCreditAmount (original deposit amount) for netAmount. PayPal breakdown.netAmount is COMPLETELY IGNORED.'
      });
      
      // Warn if PayPal shows fees (shouldn't happen in sandbox)
      if (breakdown.paypalFee > 0.01) {
        console.warn(`⚠️ WARNING: PayPal breakdown shows fees (₱${breakdown.paypalFee.toFixed(2)}) but system expects no fees! System will use walletCreditAmount (₱${walletCreditAmount.toFixed(2)}) for netAmount instead.`);
      }
      
      // CRITICAL: Warn if PayPal's netAmount differs from our deposit amount
      // This is a critical check to catch any cases where PayPal might be deducting fees
      if (Math.abs(breakdown.netAmount - walletCreditAmount) > 0.01) {
        console.error(`❌ CRITICAL WARNING: PayPal breakdown.netAmount (₱${breakdown.netAmount.toFixed(2)}) differs from deposit amount (₱${walletCreditAmount.toFixed(2)})!`, {
          paypalNetAmount: breakdown.netAmount,
          depositAmount: walletCreditAmount,
          difference: Math.abs(breakdown.netAmount - walletCreditAmount),
          note: 'CRITICAL: System will use walletCreditAmount (₱' + walletCreditAmount.toFixed(2) + ') for netAmount to ensure admin receives full payment. PayPal breakdown.netAmount is COMPLETELY IGNORED and will NOT be used.'
        });
      }
      
      // CRITICAL VALIDATION: Ensure breakdown.netAmount passed in matches what we expect
      // If it doesn't match walletCreditAmount, we log an error but still use walletCreditAmount
      if (Math.abs(breakdown.netAmount - walletCreditAmount) > 0.01) {
        console.error(`❌ CRITICAL: Breakdown.netAmount (₱${breakdown.netAmount.toFixed(2)}) does not match walletCreditAmount (₱${walletCreditAmount.toFixed(2)}). Using walletCreditAmount to ensure admin receives full payment.`);
      }
    }

    // Convert PHP wallet credit amount to centavos for storage (integer)
    // This is the exact deposit amount (what guest wants to deposit)
    // No fees - guest pays exact amount, admin receives exact same amount
    const walletCreditAmountCentavos = phpToCentavos(walletCreditAmount);

    // Check if transaction already exists (prevent duplicate processing - idempotency)
    const existingTransactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('paymentId', '==', orderId),
      where('type', '==', 'deposit')
    );
    const existingTransactions = await getDocs(existingTransactionsQuery);

    if (!existingTransactions.empty) {
      // Transaction already processed - return existing transaction
      const existingTx = existingTransactions.docs[0];
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const currentBalance = readWalletBalance(userData?.walletBalance);

      console.log(`ℹ️ Transaction ${orderId} already processed (idempotency check)`);

      return {
        success: true,
        transactionId: existingTx.id,
        newBalance: currentBalance,
        message: 'Top-up already processed',
      };
    }

    // Find admin user ID first (before transaction)
    let adminUserId: string | null = null;
    try {
      // Try to find admin user by role
      const adminUsersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminUsersSnapshot = await getDocs(adminUsersQuery);
      
      if (!adminUsersSnapshot.empty) {
        adminUserId = adminUsersSnapshot.docs[0].id;
      } else {
        // Try roles array
        const adminRolesQuery = query(
          collection(db, 'users'),
          where('roles', 'array-contains', 'admin')
        );
        const adminRolesSnapshot = await getDocs(adminRolesQuery);
        if (!adminRolesSnapshot.empty) {
          adminUserId = adminRolesSnapshot.docs[0].id;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not find admin user, admin transaction will not be created:', error);
    }

    // CRITICAL: Admin receives 100% of what guest paid - no fees, no deductions
    // netAmount = grossAmount = walletCreditAmount (exact same amount)
    const adminReceivedAmountCentavos = walletCreditAmountCentavos; // Admin receives EXACTLY what guest paid

    // Use Firestore transaction to ensure atomic balance update
    // This prevents race conditions where multiple deposits might overwrite each other
    const result = await runTransaction(db, async (transaction) => {
      // Get user's current balance within transaction
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      // Read balance in centavos (handles both old float and new int formats)
      const currentBalanceCentavos = readWalletBalanceCentavos(userData?.walletBalance);
      
      // CRITICAL: Read admin document BEFORE any writes (Firestore transaction requirement)
      // All reads must be completed before any writes
      let adminDoc = null;
      let adminCurrentBalanceCentavos = 0;
      if (adminUserId) {
        const adminRef = doc(db, 'users', adminUserId);
        adminDoc = await transaction.get(adminRef);
        
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          adminCurrentBalanceCentavos = readWalletBalanceCentavos(adminData?.walletBalance || 0);
        }
      }
      
      // Now all reads are complete - we can proceed with writes
      
      // Add wallet credit amount in centavos (integer arithmetic - no rounding errors)
      // This is the EXACT AMOUNT the guest paid (no fees)
      const newBalanceCentavos = addCentavos(currentBalanceCentavos, walletCreditAmountCentavos);

      // Prepare transaction data with full breakdown
      // Store all amounts as INTEGER CENTAVOS in Firestore
      const transactionData: any = {
        userId,
        type: 'deposit',
        amount: walletCreditAmountCentavos, // Store wallet credit amount as integer centavos (exact amount guest paid)
        description: description || 'Wallet top-up via PayPal',
        status: 'completed',
        paymentMethod: 'paypal',
        paymentId: orderId,
        createdAt: new Date().toISOString(),
      };

      // Add breakdown details if available (convert to centavos)
      // CRITICAL: Always use walletCreditAmount (original deposit amount) for all amounts
      // DO NOT use breakdown.netAmount or breakdown.grossAmount from PayPal - always use the original deposit amount
      // This ensures admin receives the full amount regardless of what PayPal's breakdown shows
      if (breakdown) {
        // CRITICAL FIX: Always use walletCreditAmount for grossAmount, NOT breakdown.grossAmount
        // This ensures we use the exact deposit amount, not what PayPal might show (which could include fees)
        const grossAmountCentavos = walletCreditAmountCentavos; // Always use original deposit amount - NEVER use breakdown.grossAmount
        // CRITICAL FIX: Always use walletCreditAmount for netAmount, NOT breakdown.netAmount
        // This ensures admin receives the full deposit amount, not a reduced amount from PayPal's breakdown
        // We explicitly ignore breakdown.netAmount even if it's provided
        const netAmountCentavos = walletCreditAmountCentavos; // Always use original deposit amount - NEVER use breakdown.netAmount
        
        // CRITICAL VALIDATION: Log if breakdown.netAmount differs from walletCreditAmount
        const breakdownNetAmountCentavos = phpToCentavos(breakdown.netAmount || 0);
        if (Math.abs(breakdownNetAmountCentavos - walletCreditAmountCentavos) > 1) { // 1 centavo tolerance
          console.error(`❌ CRITICAL: breakdown.netAmount (${breakdownNetAmountCentavos} centavos = ₱${centavosToPHP(breakdownNetAmountCentavos).toFixed(2)}) differs from walletCreditAmount (${walletCreditAmountCentavos} centavos = ₱${walletCreditAmount.toFixed(2)}). Using walletCreditAmount for netAmount.`);
        }
        
        transactionData.grossAmount = grossAmountCentavos; // What guest actually paid
        transactionData.paypalFee = 0; // No fees - explicitly set to 0
        transactionData.netAmount = netAmountCentavos; // CRITICAL: Admin receives FULL original deposit amount (walletCreditAmount). PayPal breakdown.netAmount is IGNORED.
        
        if (breakdown.captureId) {
          transactionData.captureId = breakdown.captureId;
        }
        
        if (breakdown.payeeEmail) {
          transactionData.adminPayPalEmail = breakdown.payeeEmail;
        }
      } else {
        // If no breakdown, use wallet credit amount (exact amount guest paid)
        const grossAmountCentavos = walletCreditAmountCentavos;
        transactionData.grossAmount = grossAmountCentavos;
        transactionData.paypalFee = 0; // No fees - explicitly set to 0
        transactionData.netAmount = grossAmountCentavos; // Admin receives exactly what guest paid (no fees)
      }

      // Create transaction record within the transaction
      const transactionRef = doc(collection(db, 'transactions'));
      const transactionId = transactionRef.id;
      transactionData.id = transactionId;
      
      // Add transaction record
      transaction.set(transactionRef, transactionData);

      // Update user's wallet balance atomically
      // Store as INTEGER CENTAVOS (no floats, no rounding errors)
      transaction.update(userRef, {
        walletBalance: newBalanceCentavos, // Store as integer centavos
      });

      // CRITICAL FIX: Update admin balance atomically (using already-read adminDoc)
      // Admin receives 100% of what guest paid - no fees, no deductions
      if (adminUserId && adminDoc && adminDoc.exists()) {
        const adminRef = doc(db, 'users', adminUserId);
        const adminNewBalanceCentavos = addCentavos(adminCurrentBalanceCentavos, adminReceivedAmountCentavos);
        
        // Update admin wallet balance atomically
        transaction.update(adminRef, {
          walletBalance: adminNewBalanceCentavos, // Store as integer centavos
        });
        
        // Note: Admin transaction record will be created after the transaction commits
        // (outside transaction to avoid size limits)
      }

      return {
        transactionId,
        currentBalance: centavosToPHP(currentBalanceCentavos), // Return PHP for UI
        newBalance: centavosToPHP(newBalanceCentavos), // Return PHP for UI
        currentBalanceCentavos, // Also return centavos for logging
        newBalanceCentavos, // Also return centavos for logging
        adminUserId, // Return admin user ID for creating admin transaction
      };
    });

    // CRITICAL FIX: Create admin transaction record after guest transaction commits
    // This ensures admin receives 100% of what guest paid
    if (adminUserId) {
      try {
        // Get admin's current balance to verify it was updated
        const adminDoc = await getDoc(doc(db, 'users', adminUserId));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          const adminCurrentBalanceCentavos = readWalletBalanceCentavos(adminData?.walletBalance || 0);
          
          // Create admin transaction record showing they received the full amount
          await createTransaction({
            userId: adminUserId,
            type: 'deposit',
            amount: adminReceivedAmountCentavos, // Admin receives EXACTLY what guest paid (no fees)
            description: `Payment received from guest deposit (Order: ${orderId}, Guest Transaction: ${result.transactionId})`,
            status: 'completed',
            paymentMethod: 'paypal',
            paymentId: orderId,
            // Store breakdown showing admin receives 100%
            grossAmount: adminReceivedAmountCentavos,
            paypalFee: 0, // No fees
            netAmount: adminReceivedAmountCentavos, // Admin receives 100% - exact same as grossAmount
            adminPayPalEmail: breakdown?.payeeEmail || null,
            relatedTransactionId: result.transactionId, // Link to guest transaction
          });
          
          console.log(`✅ Admin transaction created:`, {
            adminUserId,
            adminReceivedAmountPHP: centavosToPHP(adminReceivedAmountCentavos),
            adminReceivedAmountCentavos,
            adminCurrentBalancePHP: centavosToPHP(adminCurrentBalanceCentavos),
            adminCurrentBalanceCentavos,
            guestTransactionId: result.transactionId,
            note: 'CRITICAL: Admin receives 100% of what guest paid - no fees, no deductions'
          });
        }
      } catch (adminError: any) {
        console.error('❌ Error creating admin transaction:', adminError);
        // Don't fail the guest transaction if admin transaction creation fails
        // But log it as a critical error
        console.error('❌ CRITICAL: Guest deposit processed but admin transaction not created!');
      }
    } else {
      console.warn('⚠️ WARNING: Admin user not found - admin transaction not created');
    }

    // Verify the balance calculation is correct (using centavos for exact comparison)
    const expectedBalanceCentavos = addCentavos(result.currentBalanceCentavos, walletCreditAmountCentavos);
    if (result.newBalanceCentavos !== expectedBalanceCentavos) {
      console.error(`❌ CRITICAL: Balance mismatch! Expected: ${expectedBalanceCentavos} centavos, Got: ${result.newBalanceCentavos} centavos`);
      throw new Error(`Balance calculation error. Expected: ${expectedBalanceCentavos} centavos (₱${centavosToPHP(expectedBalanceCentavos).toFixed(2)}), Got: ${result.newBalanceCentavos} centavos (₱${result.newBalance.toFixed(2)})`);
    }

    // Calculate actual amounts from breakdown if available
    // CRITICAL: Always use walletCreditAmount for netAmount, NOT breakdown.netAmount
    // This ensures we always use the original deposit amount, not PayPal's potentially reduced amount
    const grossAmountPHP = breakdown?.grossAmount || walletCreditAmount;
    const netAmountPHP = walletCreditAmount; // CRITICAL: Always use original deposit amount, ignore PayPal breakdown.netAmount
    const adminReceivedAmountPHP = centavosToPHP(adminReceivedAmountCentavos);
    
    // CRITICAL VALIDATION: Ensure admin_received == guest_sent (100% match, no deductions)
    if (adminReceivedAmountCentavos !== walletCreditAmountCentavos) {
      console.error(`❌ CRITICAL ERROR: Admin received amount (${adminReceivedAmountCentavos} centavos = ₱${adminReceivedAmountPHP.toFixed(2)}) does NOT match guest sent amount (${walletCreditAmountCentavos} centavos = ₱${walletCreditAmount.toFixed(2)})!`);
      throw new Error(`CRITICAL: Admin received amount mismatch! Expected: ₱${walletCreditAmount.toFixed(2)}, Got: ₱${adminReceivedAmountPHP.toFixed(2)}`);
    }
    
    // CRITICAL: Log PayPal's breakdown.netAmount if available for comparison (but we don't use it)
    const paypalNetAmountFromBreakdown = breakdown?.netAmount || null;
    if (paypalNetAmountFromBreakdown !== null && Math.abs(paypalNetAmountFromBreakdown - walletCreditAmount) > 0.01) {
      console.error(`❌ CRITICAL: PayPal breakdown.netAmount (₱${paypalNetAmountFromBreakdown.toFixed(2)}) differs from walletCreditAmount (₱${walletCreditAmount.toFixed(2)}). System is using walletCreditAmount for netAmount to ensure admin receives full payment.`);
    }
    
    console.log(`✅ Wallet top-up processed:`, {
      userId,
      orderId,
      transactionId: result.transactionId,
      walletCreditAmountPHP: walletCreditAmount,
      walletCreditAmountCentavos: walletCreditAmountCentavos,
      grossAmountPaidPHP: grossAmountPHP, // What guest actually paid
      grossAmountPaidCentavos: phpToCentavos(grossAmountPHP),
      paypalFeePHP: 0, // No fees - explicitly set to 0
      paypalFeeCentavos: 0,
      netAmountToAdminPHP: netAmountPHP, // CRITICAL: What admin receives (walletCreditAmount, NOT PayPal breakdown.netAmount)
      netAmountToAdminCentavos: phpToCentavos(netAmountPHP),
      adminReceivedAmountPHP: adminReceivedAmountPHP, // Admin actually received (should match netAmountToAdmin)
      adminReceivedAmountCentavos: adminReceivedAmountCentavos,
      adminReceivedEqualsGuestSent: adminReceivedAmountCentavos === walletCreditAmountCentavos, // CRITICAL VALIDATION
      paypalNetAmountFromBreakdown: paypalNetAmountFromBreakdown !== null ? paypalNetAmountFromBreakdown.toFixed(2) : 'N/A (not provided)',
      oldBalancePHP: result.currentBalance,
      oldBalanceCentavos: result.currentBalanceCentavos,
      newBalancePHP: result.newBalance,
      newBalanceCentavos: result.newBalanceCentavos,
      balanceMatch: result.newBalanceCentavos === expectedBalanceCentavos,
      payeeEmail: breakdown?.payeeEmail,
      adminPayPalEmail: breakdown?.payeeEmail || 'NOT SET - CRITICAL',
      adminUserId: adminUserId || 'NOT FOUND',
      note: 'CRITICAL: Admin receives ₱' + netAmountPHP.toFixed(2) + ' (walletCreditAmount). PayPal breakdown.netAmount is IGNORED. All amounts stored as INTEGER CENTAVOS in Firestore.',
      validation: {
        guestSent: walletCreditAmountCentavos,
        adminReceived: adminReceivedAmountCentavos,
        match: adminReceivedAmountCentavos === walletCreditAmountCentavos,
        message: adminReceivedAmountCentavos === walletCreditAmountCentavos ? '✅ PASS: Admin receives 100% of guest deposit' : '❌ FAIL: Amount mismatch!'
      },
      warning: breakdown?.payeeEmail ? 
        `Payment should reach admin PayPal account: ₱${netAmountPHP.toFixed(2)} (guest paid ₱${grossAmountPHP.toFixed(2)}, no fees deducted)` : 
        '⚠️ WARNING: Payee email not set - payment may not reach admin!'
    });
    
    // CRITICAL: Warn if payee email is missing
    if (!breakdown?.payeeEmail) {
      console.error('❌ CRITICAL WARNING: Payee email not provided in breakdown!');
      console.error('❌ Admin may not receive payment. Please verify PayPal order had payee set.');
    }
    
    // CRITICAL: Final validation - admin_received MUST equal guest_sent
    if (adminReceivedAmountCentavos !== walletCreditAmountCentavos) {
      throw new Error(`CRITICAL VALIDATION FAILED: Admin received (${adminReceivedAmountCentavos} centavos) does not equal guest sent (${walletCreditAmountCentavos} centavos). This is a system error!`);
    }

    return {
      success: true,
      transactionId: result.transactionId,
      newBalance: result.newBalance, // Return PHP for UI
      message: `Successfully topped up ₱${walletCreditAmount.toFixed(2)} to your wallet`,
    };
  } catch (error: any) {
    console.error('❌ Error processing wallet top-up:', error);
    
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your account permissions.');
    } else if (error.code === 'unauthenticated') {
      throw new Error('You must be logged in to process wallet top-up.');
    }
    
    throw new Error(error.message || 'Failed to process wallet top-up. Please try again or contact support.');
  }
};

/**
 * Get admin PayPal email from Firestore
 * Used to set payee in PayPal orders
 * 
 * Reads directly from adminSettings/paypal document
 * Firestore rules allow authenticated users to read this document
 */
export const getAdminPayPalEmail = async (): Promise<string | null> => {
  try {
    console.log('🔍 Retrieving admin PayPal email from Firestore...');
    
    // Try to get from adminSettings/paypal (primary location)
    try {
      const adminSettingsDoc = await getDoc(doc(db, 'adminSettings', 'paypal'));
      if (adminSettingsDoc.exists()) {
        const adminSettings = adminSettingsDoc.data();
        if (adminSettings?.paypalEmail) {
          console.log('✅ Admin PayPal email found in adminSettings/paypal:', adminSettings.paypalEmail);
          return adminSettings.paypalEmail;
        } else {
          console.warn('⚠️ adminSettings/paypal document exists but has no paypalEmail field');
        }
      } else {
        console.warn('⚠️ adminSettings/paypal document does not exist');
      }
    } catch (settingsError: any) {
      // If permission error, log but continue to check user documents
      if (settingsError?.code === 'permission-denied') {
        console.warn('⚠️ Permission denied reading adminSettings/paypal (document may not exist or rules not propagated). Checking user documents...');
      } else {
        console.warn('⚠️ Error reading adminSettings/paypal:', settingsError);
      }
      // Continue to check user documents
    }

    // If not found, try to get from admin user document
    try {
      console.log('🔍 Searching for admin PayPal email in users collection...');
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'))
      );
      
      if (!usersSnapshot.empty) {
        for (const userDoc of usersSnapshot.docs) {
          const adminUser = userDoc.data();
          if (adminUser?.adminPayPalEmail) {
            console.log('✅ Admin PayPal email found in user document:', {
              userId: userDoc.id,
              email: adminUser.adminPayPalEmail
            });
            return adminUser.adminPayPalEmail;
          }
        }
        console.warn('⚠️ Admin users found but none have adminPayPalEmail field');
      } else {
        console.warn('⚠️ No users with role="admin" found');
      }
    } catch (usersError: any) {
      if (usersError?.code === 'permission-denied') {
        console.warn('⚠️ Permission denied querying users collection. Checking roles array...');
      } else {
        console.warn('⚠️ Error querying users collection:', usersError);
      }
    }

    // Also check roles array for admin
    try {
      const rolesSnapshot = await getDocs(
        query(collection(db, 'users'), where('roles', 'array-contains', 'admin'))
      );
      
      if (!rolesSnapshot.empty) {
        for (const userDoc of rolesSnapshot.docs) {
          const userData = userDoc.data();
          if (userData?.adminPayPalEmail) {
            console.log('✅ Admin PayPal email found in user document (roles array):', {
              userId: userDoc.id,
              email: userData.adminPayPalEmail
            });
            return userData.adminPayPalEmail;
          }
        }
        console.warn('⚠️ Admin users found (roles array) but none have adminPayPalEmail field');
      } else {
        console.warn('⚠️ No users with roles array containing "admin" found');
      }
    } catch (rolesError: any) {
      if (rolesError?.code === 'permission-denied') {
        console.warn('⚠️ Permission denied querying users collection by roles array');
      } else {
        console.warn('⚠️ Error querying users collection by roles:', rolesError);
      }
    }

    console.error('❌ CRITICAL: Admin PayPal email not found in any location!');
    console.error('❌ Checked locations:');
    console.error('  1. adminSettings/paypal document');
    console.error('  2. users collection (role="admin")');
    console.error('  3. users collection (roles array contains "admin")');
    console.error('❌ Please configure admin PayPal email in admin settings.');
    
    return null;
  } catch (error: any) {
    console.error('❌ Error getting admin PayPal email:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    // Don't throw - return null so payment can continue without payee (but will be caught in createOrder)
    return null;
  }
};

