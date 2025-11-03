import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Facebook, Twitter, MessageCircle, Link as LinkIcon, Copy, Check } from "lucide-react";
import { useState } from "react";
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

  const shareUrl = encodeURIComponent(url);
  const shareText = encodeURIComponent(title);
  const shareDescription = encodeURIComponent(description);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
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
  );
};

