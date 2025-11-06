import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Facebook, Twitter, MessageCircle, Link as LinkIcon, Copy, Check, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const SocialShare = ({ 
  url, 
  title, 
  description = "",
  variant = "outline",
  size = "default"
}: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("Copy");
  const inputRef = useRef<HTMLInputElement>(null);

  const shareUrl = encodeURIComponent(url);
  const shareText = encodeURIComponent(title);
  const shareDescription = encodeURIComponent(description);

  const handleCopyLink = async () => {
    // Try to copy directly first
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isSecureContext) {
      try {
        // Method 1: Try modern clipboard API (works on HTTPS and localhost)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
            return;
          } catch (clipboardError) {
            // If clipboard API fails, show dialog
            console.log('Clipboard API failed:', clipboardError);
          }
        }
        
        // Method 2: Fallback using execCommand
        const input = document.createElement('input');
        input.value = url;
        input.type = 'text';
        input.readOnly = true;
        input.style.position = 'fixed';
        input.style.left = '0';
        input.style.top = '0';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        input.style.zIndex = '9999';
        
        document.body.appendChild(input);
        input.focus();
        input.select();
        input.setSelectionRange(0, url.length);
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(input);
          
          if (successful) {
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
            return;
          }
        } catch (execError) {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
    
    // If all methods fail or not secure context, show dialog
    setShowCopyDialog(true);
    setCopyButtonText("Copy");
    // Focus input after dialog opens
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 100);
  };

  const handleCopyFromDialog = async () => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    input.focus();
    input.select();
    input.setSelectionRange(0, url.length);
    
    try {
      // Try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          setCopyButtonText("Copied!");
          setCopied(true);
          toast.success("Link copied to clipboard!");
          
          setTimeout(() => {
            setCopyButtonText("Copy");
            setShowCopyDialog(false);
            setCopied(false);
          }, 1500);
          return;
        } catch (clipboardError) {
          // Fall through to execCommand
        }
      }
      
      // Fallback to execCommand
      await new Promise(resolve => setTimeout(resolve, 10));
      const successful = document.execCommand('copy');
      
      if (successful) {
        setCopyButtonText("Copied!");
        setCopied(true);
        toast.success("Link copied to clipboard!");
        
        setTimeout(() => {
          setCopyButtonText("Copy");
          setShowCopyDialog(false);
          setCopied(false);
        }, 1500);
      } else {
        // If execCommand fails, just select the text so user can manually copy
        input.select();
        toast.info("Text selected. Press Ctrl+C (or Cmd+C) to copy");
        setCopyButtonText("Copy");
      }
    } catch (error) {
      console.error('Copy failed:', error);
      input.select();
      toast.info("Text selected. Press Ctrl+C (or Cmd+C) to copy");
      setCopyButtonText("Copy");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback to copy link if share API not available
      handleCopyLink();
    }
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}${description ? `&hashtags=MojoDojoCasaHouse` : ''}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Native Share Button (Mobile) */}
        {navigator.share && (
          <Button
            variant={variant}
            size={size}
            onClick={handleNativeShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}

        {/* Dropdown Menu for Desktop */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={variant} size={size} className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              {!navigator.share && <span>Share</span>}
              {navigator.share && <span className="hidden sm:inline">More</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={shareToFacebook}>
              <Facebook className="h-4 w-4 mr-2 text-blue-600" />
              Share to Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToTwitter}>
              <Twitter className="h-4 w-4 mr-2 text-sky-500" />
              Share to Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
              Share to WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Copy Link Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Copy Link
            </DialogTitle>
            <DialogDescription>
              Share this listing with others by copying the link below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={url}
                readOnly
                className="flex-1 font-mono text-sm"
                onFocus={(e) => e.target.select()}
              />
              <Button
                onClick={handleCopyFromDialog}
                className="shrink-0"
                variant={copyButtonText === "Copied!" ? "default" : "secondary"}
              >
                {copyButtonText === "Copied!" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: You can also select the link above and press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+C</kbd> (or <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Cmd+C</kbd> on Mac) to copy
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

