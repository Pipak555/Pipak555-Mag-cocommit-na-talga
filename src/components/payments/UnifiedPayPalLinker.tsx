import { useState } from "react";
import PayPalIdentity from "./PayPalIdentity";
import type { PayPalLinkInfo, PayPalRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnifiedPayPalLinkerProps {
  userId: string;
  role: PayPalRole;
  linkedInfo?: PayPalLinkInfo | null;
  onLinked: (email: string) => Promise<void> | void;
  onUnlink?: () => Promise<void>;
  unlinkMessage?: string;
}

const UnifiedPayPalLinker = ({
  userId,
  role,
  linkedInfo,
  onLinked,
  onUnlink,
  unlinkMessage = "Are you sure you want to unlink this PayPal account? Transactions will be blocked until you link a new one."
}: UnifiedPayPalLinkerProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PayPalIdentity
        userId={userId}
        role={role}
        linkedInfo={linkedInfo || undefined}
        paypalEmail={linkedInfo?.email ?? undefined}
        paypalVerified={!!linkedInfo?.email}
        onVerified={onLinked}
      />

      {linkedInfo?.email && onUnlink && (
        <>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Unlink PayPal Account
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unlink PayPal Account</AlertDialogTitle>
                <AlertDialogDescription>
                  {unlinkMessage}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await onUnlink();
                    setConfirmOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Unlink
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default UnifiedPayPalLinker;

