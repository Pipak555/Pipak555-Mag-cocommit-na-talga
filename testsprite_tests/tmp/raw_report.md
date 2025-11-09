
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** firebnb-spark day5
- **Date:** 2025-11-08
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** Guest Login Success
- **Test Code:** [TC001_Guest_Login_Success.py](./TC001_Guest_Login_Success.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/a7bb64b3-5d26-4008-bb80-352ebebe075e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** Host Login with Google OAuth
- **Test Code:** [TC002_Host_Login_with_Google_OAuth.py](./TC002_Host_Login_with_Google_OAuth.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/7bb03514-4663-48b6-9da1-9480bf8f0a00
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Admin Access Role Enforcement
- **Test Code:** [TC003_Admin_Access_Role_Enforcement.py](./TC003_Admin_Access_Role_Enforcement.py)
- **Test Error:** Verification results: Guest and host users are denied access to the admin dashboard URL, receiving either empty content or a 404 Page Not Found error, indicating proper access restrictions. The admin user login and access to admin portal could not be tested due to missing valid admin credentials and the admin portal URL returning 404 error. Overall, the system enforces access control preventing non-admin users from accessing admin features, but full verification with admin user login is pending.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/chunk-WOOG5QLI.js?v=e00a9993:0:0)
[ERROR] WebSocket connection to 'ws://localhost:8080/?token=_FW-wY3NztyZ' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/@vite/client:535:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/admin:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /login (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/75aae4eb-1aef-44b3-80e9-f0a9fd286fa2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Create Host Listing with Required Fields and Image Upload
- **Test Code:** [TC004_Create_Host_Listing_with_Required_Fields_and_Image_Upload.py](./TC004_Create_Host_Listing_with_Required_Fields_and_Image_Upload.py)
- **Test Error:** Login attempt failed due to incorrect password. Cannot proceed with creating a listing without valid login credentials. Task stopped as per instructions.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/chunk-WOOG5QLI.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/index.css:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/049f8d2b-495f-44f8-90b7-32d99ab552fc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Listing Publish Fee Payment and Admin Approval Workflow
- **Test Code:** [TC005_Listing_Publish_Fee_Payment_and_Admin_Approval_Workflow.py](./TC005_Listing_Publish_Fee_Payment_and_Admin_Approval_Workflow.py)
- **Test Error:** The test to verify that after host pays the listing publish fee via PayPal, the listing status changes to pending approval and admin can approve or reject the listing was partially completed. The admin was able to access the pending listings for approval. However, both approval and rejection actions failed with error notifications 'Failed to approve listing' and 'Failed to reject listing'. Earlier steps involving host login, listing creation, and payment could not be fully tested due to persistent loading screen issues. Therefore, the task is not fully successful and requires further investigation and fixes in the system.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/toaster.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/react.js?v=e00a9993:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/sonner.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/tooltip.tsx:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/hooks/use-toast.ts:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/f00d7b3c-8b7a-4fb1-98ef-0c12c426b62a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Guest Search with Filters and Autocomplete
- **Test Code:** [TC006_Guest_Search_with_Filters_and_Autocomplete.py](./TC006_Guest_Search_with_Filters_and_Autocomplete.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/f4362702-d39f-4d12-8a97-a12187746210
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Guest Booking with Coupon Application and Reward Points Redemption
- **Test Code:** [TC007_Guest_Booking_with_Coupon_Application_and_Reward_Points_Redemption.py](./TC007_Guest_Booking_with_Coupon_Application_and_Reward_Points_Redemption.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/shared/Logo.tsx:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/c84737dc-7001-4aa0-bf48-c15511ca4a07
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Booking Payment via E-wallet and PayPal with Refund Handling
- **Test Code:** [TC008_Booking_Payment_via_E_wallet_and_PayPal_with_Refund_Handling.py](./TC008_Booking_Payment_via_E_wallet_and_PayPal_with_Refund_Handling.py)
- **Test Error:** Stopped testing due to inability to proceed past guest login page after successful login credentials input. The booking and payment flow cannot be tested. Please investigate the login navigation issue.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5 (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/ddec0ac5-8168-49b4-a8ff-c5d220ca55b0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Real-time Messaging Between Guests and Hosts
- **Test Code:** [TC009_Real_time_Messaging_Between_Guests_and_Hosts.py](./TC009_Real_time_Messaging_Between_Guests_and_Hosts.py)
- **Test Error:** The guest login process is blocked due to failure to authenticate with valid credentials. This prevents proceeding with the messaging test to verify real-time message delivery between guest and host. The issue should be investigated and resolved before retesting.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/chunk-QCHXOAYK.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/995f1c09-4003-4c02-90be-5986862a332c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Notifications Delivery and Notification Center
- **Test Code:** [TC010_Notifications_Delivery_and_Notification_Center.py](./TC010_Notifications_Delivery_and_Notification_Center.py)
- **Test Error:** The login process is not completing successfully, preventing access to the guest portal dashboard and notification UI. Therefore, the task to verify real-time notifications for booking status changes, messages, and admin alerts cannot be completed. The issue has been reported.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5 (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/0aaf0a61-1735-4ab3-9612-3ceb798503b5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Reviews and Ratings Submission and Display
- **Test Code:** [TC011_Reviews_and_Ratings_Submission_and_Display.py](./TC011_Reviews_and_Ratings_Submission_and_Display.py)
- **Test Error:** The task to verify guests can submit reviews with ratings for bookings and that reviews are displayed correctly on listing pages could not be fully completed. Critical issues encountered include inaccessible login page, invalid login credentials, and unexpected navigation after password reset. These prevented logging in as guest, accessing completed bookings, submitting reviews, and verifying review display and aggregate rating updates. Recommend addressing these issues before retesting.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/60d20cac-a14e-4031-b26a-d9fb6b527b10
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Calendar Availability Management by Host
- **Test Code:** [TC012_Calendar_Availability_Management_by_Host.py](./TC012_Calendar_Availability_Management_by_Host.py)
- **Test Error:** The login process for the host is failing despite valid credentials, preventing access to calendar management and booking verification. The issue blocks the completion of the task to verify hosts can update availability calendar and that availability is reflected correctly in the booking process. Reporting this issue and stopping further testing is necessary.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/loading-screen.tsx:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /login (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/host/dashboard:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/host/dashboard:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/host/dashboard:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/host/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/host/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/host/login:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/61e84fc5-8222-4e12-9f28-4de08b46209b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Coupon Creation, Validation, and Redemption
- **Test Code:** [TC013_Coupon_Creation_Validation_and_Redemption.py](./TC013_Coupon_Creation_Validation_and_Redemption.py)
- **Test Error:** Coupon creation via admin portal was not possible due to admin access restrictions. A guest account was successfully created and is pending email verification with OTP code 425804. Guest booking and coupon application testing could not be completed due to verification step. Task partially completed: coupon creation and guest account creation done, but coupon application and validation during booking not tested yet.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/chunk-WOOG5QLI.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/admin:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /admin (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/admin:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/a23e8674-4965-487b-b2b7-c4c47466a70d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Guest E-wallet Balance and Transaction History
- **Test Code:** [TC014_Guest_E_wallet_Balance_and_Transaction_History.py](./TC014_Guest_E_wallet_Balance_and_Transaction_History.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/df68d0a5-fe2a-4121-9500-339d07c8bcc9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Favorites and Wishlist Save and Retrieve Listings
- **Test Code:** [TC015_Favorites_and_Wishlist_Save_and_Retrieve_Listings.py](./TC015_Favorites_and_Wishlist_Save_and_Retrieve_Listings.py)
- **Test Error:** Testing stopped due to inability to login as guest caused by Google security error blocking sign-in. Cannot verify adding listings to favorites or wishlists without login. Issue reported.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5 (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/browse:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/16f4b97a-a095-4036-b53f-a833ce916efd
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Form Input Validation and Error Handling
- **Test Code:** [TC016_Form_Input_Validation_and_Error_Handling.py](./TC016_Form_Input_Validation_and_Error_Handling.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/0568051f-68e5-495f-b1fb-75a1099bb892
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** React UI Error Boundary Handling and Feedback
- **Test Code:** [TC017_React_UI_Error_Boundary_Handling_and_Feedback.py](./TC017_React_UI_Error_Boundary_Handling_and_Feedback.py)
- **Test Error:** The React frontend error boundaries do not catch unexpected errors or display fallback UI with user feedback as required. Attempts to simulate errors by interacting with UI components such as the 'Sign In' button on the guest login page failed to trigger error boundaries or fallback UI. The app does not crash but also does not provide user feedback or retry/navigation options on error. Task is stopped due to inability to verify error boundaries.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/@react-refresh:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/App.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/index.css:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/react-dom_client.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/test-error-boundary:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/test-error-boundary:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/test-error-boundary:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/test-error-boundary:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/test-error-boundary:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /test-error-boundary (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/test-error-boundary:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/test-error-boundary:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/52a5d388-ee60-409b-a18a-e47630e16001
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018
- **Test Name:** Performance: Load Times and Responsiveness of Key Pages
- **Test Code:** [TC018_Performance_Load_Times_and_Responsiveness_of_Key_Pages.py](./TC018_Performance_Load_Times_and_Responsiveness_of_Key_Pages.py)
- **Test Error:** Testing stopped due to login failure blocking access to the guest dashboard. The login form remains on screen after valid login attempts with no navigation or error messages. Further testing cannot proceed without resolving this issue.
Browser Console Logs:
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/chunk-QCHXOAYK.js?v=e00a9993:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/C://Users//John%20Patrick%20Robles//Documents//firebnb-spark%20day5:0:0)
[WARNING] A preload for 'http://localhost:8080/src/main.tsx' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute. (at http://localhost:8080/login:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=e00a9993:4392:12)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /login (at http://localhost:8080/src/pages/NotFound.tsx:31:16)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/login:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/dashboard:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/dashboard:0:0)
[WARNING] The resource http://localhost:8080/fonts/inter-var.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/login:0:0)
[WARNING] The resource http://localhost:8080/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. (at http://localhost:8080/guest/login:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/510e7bf3-c7da-40f8-b265-4195c7c7d636/b9d9b0cb-992b-49fc-8ee2-fcd8d37d9b5a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **5.56** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---