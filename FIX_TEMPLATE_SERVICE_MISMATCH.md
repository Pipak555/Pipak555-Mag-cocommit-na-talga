# Fix Template ID Not Found Error

## Problem
EmailJS returns: "The template ID not found" even though the template ID is correct.

## Root Cause
**The Password Reset template is in a DIFFERENT service than your SERVICE_ID.**

All EmailJS templates must be in the **same service** as your `VITE_EMAILJS_SERVICE_ID`.

## Solution

### Option 1: Move Template to Correct Service (Recommended)

1. **Go to EmailJS Dashboard** → Email Templates
2. **Find your Password Reset template** (`template_jianolj`)
3. **Check which Service it's in** (look at the template details)
4. **Compare with your SERVICE_ID** in `.env` file:
   - Your SERVICE_ID: `service_s9xxqfy` (or whatever is in your .env)
   - Template's Service: Should match exactly

5. **If they don't match:**
   - **Option A**: Create a new Password Reset template in the correct service
   - **Option B**: Copy the template HTML to a new template in the correct service

### Option 2: Verify Template is in Correct Service

1. **Go to EmailJS Dashboard** → Email Services
2. **Find your service** (the one matching your `VITE_EMAILJS_SERVICE_ID`)
3. **Click on it** to see all templates in that service
4. **Verify Password Reset template is listed there**

### Option 3: Use Same Service for All Templates

Make sure ALL your templates are in the SAME service:
- ✅ Verification template → Service: `service_s9xxqfy`
- ✅ Booking template → Service: `service_s9xxqfy`
- ✅ Password Reset template → Service: `service_s9xxqfy` (must match!)

## Quick Check

In EmailJS Dashboard:
1. Go to **Email Templates** → **Password Reset**
2. Look at the **Service** field
3. It should say: `service_s9xxqfy` (or whatever your SERVICE_ID is)
4. If it's different, that's the problem!

## After Fixing

1. Make sure template is in the correct service
2. Save the template
3. Try password reset again
4. Should work! ✅

