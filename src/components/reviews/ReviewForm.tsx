import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { createReview } from "@/lib/firestore";
import { createTransaction } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface ReviewFormProps {
  listingId: string;
  bookingId: string;
  onSuccess: () => void;
}

export const ReviewForm = ({ listingId, bookingId, onSuccess }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please provide a rating");
      return;
    }

    setLoading(true);
    try {
      await createReview({
        listingId,
        bookingId,
        guestId: user.uid,
        rating,
        comment,
      });

      // Award points for writing a review (20 points)
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentPoints = userData.points || 0;
          const pointsToAward = 20; // Points for writing a review
          const newPoints = currentPoints + pointsToAward;
          
          await updateDoc(doc(db, 'users', user.uid), {
            points: newPoints
          });

          // Create reward transaction
          await createTransaction({
            userId: user.uid,
            type: 'reward',
            amount: pointsToAward,
            description: `Points earned for writing a review`,
            status: 'completed',
            bookingId: bookingId
          });

          if (import.meta.env.DEV) {
            console.log('✅ Points awarded for review:', {
              guestId: user.uid,
              pointsAwarded: pointsToAward,
              newPoints
            });
          }
        }
      } catch (pointsError) {
        console.error('Error awarding points for review:', pointsError);
        // Don't fail review submission if points award fails
      }

      toast.success("Review submitted! You earned 20 points.");
      onSuccess();
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm mb-2">Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-8 w-8 cursor-pointer ${
                  star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
                }`}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>

        <div>
          <Textarea
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Review"}
        </Button>
      </CardContent>
    </Card>
  );
};
