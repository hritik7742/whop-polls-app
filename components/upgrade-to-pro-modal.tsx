'use client';

import { useState } from 'react';
import { Crown, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useIframeSdk } from '@whop/react';

interface UpgradeToProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proFeatures = [
  "Unlimited polls",
  "Advanced analytics", 
  "Team collaboration",
  "Priority support",
  "Custom branding"
];

export function UpgradeToProModal({ open, onOpenChange }: UpgradeToProModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const iframeSdk = useIframeSdk();

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      // Get the access pass ID and plan ID from environment variables
      const accessPassId = process.env.NEXT_PUBLIC_WHOP_ACCESS_PASS_ID;
      const planId = process.env.NEXT_PUBLIC_WHOP_PLAN_ID;

      if (!accessPassId || !planId) {
        throw new Error('Whop configuration missing. Please check environment variables.');
      }

      // Open Whop checkout modal using iframe SDK
      const res = await iframeSdk.inAppPurchase({ 
        planId: planId 
      });
      
      if (res.status === "ok") {
        console.log('Payment successful!', res.data.receiptId);
        setIsLoading(false);
        onOpenChange(false);
        // You can add success toast or redirect logic here
      } else {
        console.error('Payment failed:', res.error);
        setIsLoading(false);
        // You can add error toast here
      }

    } catch (error) {
      console.error('Error opening checkout modal:', error);
      setIsLoading(false);
      // Fallback to opening in new window if iframe SDK fails
      const checkoutUrl = `https://whop.com/checkout/${process.env.NEXT_PUBLIC_WHOP_ACCESS_PASS_ID}?plan_id=${process.env.NEXT_PUBLIC_WHOP_PLAN_ID}`;
      window.open(checkoutUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Crown className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold">Upgrade to Pro</DialogTitle>
            <DialogDescription className="text-sm">
              Get unlimited access to all features
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-primary">$7</div>
            <div className="text-sm text-muted-foreground">per month</div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Upgrade Button */}
          <Button 
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </div>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
