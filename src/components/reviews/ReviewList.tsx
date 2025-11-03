import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, ArrowUpDown, Clock, TrendingUp, ThumbsUp } from "lucide-react";
import { getListingReviews } from "@/lib/firestore";
import type { Review } from "@/types";

interface ReviewListProps {
  listingId: string;
}

type SortOption = 'newest' | 'highest' | 'lowest' | 'most_helpful';

export const ReviewList = ({ listingId }: ReviewListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReviews();
    loadHelpfulReviews();
  }, [listingId]);

  const loadReviews = async () => {
    try {
      const data = await getListingReviews(listingId);
      setReviews(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadHelpfulReviews = () => {
    const stored = localStorage.getItem(`helpful_reviews_${listingId}`);
    if (stored) {
      setHelpfulReviews(new Set(JSON.parse(stored)));
    }
  };

  const handleHelpful = (reviewId: string) => {
    const newHelpful = new Set(helpfulReviews);
    if (newHelpful.has(reviewId)) {
      newHelpful.delete(reviewId);
    } else {
      newHelpful.add(reviewId);
    }
    setHelpfulReviews(newHelpful);
    localStorage.setItem(`helpful_reviews_${listingId}`, JSON.stringify(Array.from(newHelpful)));
  };

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      case 'most_helpful':
        return sorted.sort((a, b) => {
          const aHelpful = helpfulReviews.has(a.id) ? 1 : 0;
          const bHelpful = helpfulReviews.has(b.id) ? 1 : 0;
          if (aHelpful !== bHelpful) return bHelpful - aHelpful;
          return b.rating - a.rating; // Secondary sort by rating
        });
      default:
        return sorted;
    }
  }, [reviews, sortBy, helpfulReviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      dist[review.rating as keyof typeof dist]++;
    });
    return dist;
  }, [reviews]);

  if (loading) return <p>Loading reviews...</p>;

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No reviews yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold mb-2">
            Reviews ({reviews.length})
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-bold ml-1">{averageRating}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>
        
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Newest First</span>
              </div>
            </SelectItem>
            <SelectItem value="highest">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Highest Rated</span>
              </div>
            </SelectItem>
            <SelectItem value="lowest">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 rotate-180" />
                <span>Lowest Rated</span>
              </div>
            </SelectItem>
            <SelectItem value="most_helpful">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                <span>Most Helpful</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rating Distribution */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="text-sm font-medium mb-3">Rating Breakdown</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].reverse().map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const percentage = (count / reviews.length) * 100;
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-background rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarFallback>
                    {review.guestId.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mb-3 leading-relaxed">{review.comment}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleHelpful(review.id)}
                  >
                    <ThumbsUp className={`h-3 w-3 mr-1 ${helpfulReviews.has(review.id) ? 'fill-primary text-primary' : ''}`} />
                    Helpful {helpfulReviews.has(review.id) && '(1)'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
