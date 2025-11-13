"use strict";
/**
 * PayPal Payouts API Service
 *
 * Handles sending payouts to hosts and admin via PayPal Payouts API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAdminPayout = exports.processHostPayout = exports.getPayoutStatus = exports.sendPayPalPayout = void 0;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// PayPal API Configuration
// PayPal Sandbox credentials (for testing)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AV_tLDGMXIHhXnRCrDuX-Nb-2Wa-hEWjAkTj5ssXye5oTJeDZzTQqQym3UgFe-gOZDaQ1Fn-t8YPvfkx';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EBY2ts8baThwt97plOoNWxeryVxWHXEe-ANWAexRZ7zq1sfq-qIa90XNhC5JExAaFGTvrF_TT2hqwzj0';
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'; // 'sandbox' or 'production'
const PAYPAL_BASE_URL = PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
/**
 * Get PayPal OAuth access token
 */
async function getPayPalAccessToken() {
    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
        const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`PayPal API error: ${errorData.error_description || response.statusText}`);
        }
        const data = await response.json();
        return data.access_token;
    }
    catch (error) {
        console.error('Error getting PayPal access token:', error.message || error);
        throw new Error('Failed to authenticate with PayPal API');
    }
}
/**
 * Send payout to a PayPal account
 */
async function sendPayPalPayout(recipientEmail, amount, currency = 'PHP', description, transactionId) {
    var _a, _b, _c;
    try {
        const accessToken = await getPayPalAccessToken();
        // Generate unique batch ID
        const batchId = `batch_${Date.now()}_${transactionId.slice(0, 8)}`;
        const payoutData = {
            sender_batch_header: {
                sender_batch_id: batchId,
                email_subject: description,
                email_message: `You have received a payment: ${description}. Amount: ${currency} ${amount.toFixed(2)}`,
            },
            items: [
                {
                    recipient_type: 'EMAIL',
                    amount: {
                        value: amount.toFixed(2),
                        currency: currency,
                    },
                    receiver: recipientEmail,
                    note: description,
                    sender_item_id: transactionId,
                },
            ],
        };
        const response = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payoutData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`PayPal Payout API error: ${errorData.message || response.statusText}`);
        }
        const payout = await response.json();
        return {
            payoutId: payout.batch_header.payout_batch_id,
            status: payout.batch_header.batch_status,
            batchId: payout.batch_header.payout_batch_id,
        };
    }
    catch (error) {
        console.error('Error sending PayPal payout:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw new Error(`Failed to send PayPal payout: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message}`);
    }
}
exports.sendPayPalPayout = sendPayPalPayout;
/**
 * Get payout status
 */
async function getPayoutStatus(payoutId) {
    try {
        const accessToken = await getPayPalAccessToken();
        const response = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts/${payoutId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`PayPal API error: ${errorData.message || response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error getting payout status:', error.message || error);
        throw new Error(`Failed to get payout status: ${error.message || 'Unknown error'}`);
    }
}
exports.getPayoutStatus = getPayoutStatus;
/**
 * Process host payout for booking earnings
 */
async function processHostPayout(hostId, transactionId, amount, bookingId) {
    try {
        // Get host's PayPal email
        const hostDoc = await db.collection('users').doc(hostId).get();
        if (!hostDoc.exists) {
            throw new Error('Host not found');
        }
        const hostData = hostDoc.data();
        const hostPayPalEmail = hostData === null || hostData === void 0 ? void 0 : hostData.paypalEmail;
        if (!hostPayPalEmail) {
            throw new Error('Host PayPal email not found. Host must link their PayPal account first.');
        }
        if (!(hostData === null || hostData === void 0 ? void 0 : hostData.paypalEmailVerified)) {
            throw new Error('Host PayPal email not verified. Host must verify their PayPal account first.');
        }
        // Send payout
        const description = `Earnings from booking #${bookingId.slice(0, 8)}`;
        const payoutResult = await sendPayPalPayout(hostPayPalEmail, amount, 'PHP', description, transactionId);
        // Update transaction with payout information
        await db.collection('transactions').doc(transactionId).update({
            payoutId: payoutResult.payoutId,
            payoutStatus: payoutResult.status,
            payoutBatchId: payoutResult.batchId,
            payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            payoutMethod: 'paypal',
        });
        console.log(`✅ Host payout processed: ${hostId}, Amount: ${amount}, Payout ID: ${payoutResult.payoutId}`);
    }
    catch (error) {
        console.error('Error processing host payout:', error);
        // Update transaction with error
        try {
            await db.collection('transactions').doc(transactionId).update({
                payoutStatus: 'failed',
                payoutError: error.message,
                payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (updateError) {
            console.error('Error updating transaction with payout error:', updateError);
        }
        throw error;
    }
}
exports.processHostPayout = processHostPayout;
/**
 * Process admin payout for service fees or subscription payments
 */
async function processAdminPayout(transactionId, amount, description) {
    try {
        // Get admin PayPal email - check both adminSettings and admin user document
        let adminPayPalEmail;
        // First, try to get from adminSettings
        const adminSettingsDoc = await db.collection('adminSettings').doc('paypal').get();
        if (adminSettingsDoc.exists) {
            const adminSettings = adminSettingsDoc.data();
            adminPayPalEmail = adminSettings === null || adminSettings === void 0 ? void 0 : adminSettings.paypalEmail;
        }
        // If not found in adminSettings, try to get from admin user document
        if (!adminPayPalEmail) {
            const usersSnapshot = await db.collection('users')
                .where('role', '==', 'admin')
                .limit(1)
                .get();
            if (!usersSnapshot.empty) {
                const adminUser = usersSnapshot.docs[0].data();
                adminPayPalEmail = adminUser === null || adminUser === void 0 ? void 0 : adminUser.adminPayPalEmail;
            }
        }
        // Also check roles array for admin
        if (!adminPayPalEmail) {
            const usersSnapshot = await db.collection('users')
                .where('roles', 'array-contains', 'admin')
                .limit(1)
                .get();
            if (!usersSnapshot.empty) {
                const adminUser = usersSnapshot.docs[0].data();
                adminPayPalEmail = adminUser === null || adminUser === void 0 ? void 0 : adminUser.adminPayPalEmail;
            }
        }
        if (!adminPayPalEmail) {
            throw new Error('Admin PayPal email not found. Admin must link their PayPal account first.');
        }
        // Send payout
        const payoutResult = await sendPayPalPayout(adminPayPalEmail, amount, 'PHP', description, transactionId);
        // Update transaction with payout information
        await db.collection('transactions').doc(transactionId).update({
            payoutId: payoutResult.payoutId,
            payoutStatus: payoutResult.status,
            payoutBatchId: payoutResult.batchId,
            payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            payoutMethod: 'paypal',
        });
        console.log(`✅ Admin payout processed: Amount: ${amount}, Payout ID: ${payoutResult.payoutId}`);
    }
    catch (error) {
        console.error('Error processing admin payout:', error);
        // Update transaction with error
        try {
            await db.collection('transactions').doc(transactionId).update({
                payoutStatus: 'failed',
                payoutError: error.message,
                payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (updateError) {
            console.error('Error updating transaction with payout error:', updateError);
        }
        throw error;
    }
}
exports.processAdminPayout = processAdminPayout;
//# sourceMappingURL=paypalPayouts.js.map