import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createPlatformEvent, sendEventNotifications } from "@/lib/eventService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Loader2, Gift, Megaphone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import LoadingScreen from "@/components/ui/loading-screen";
import { BackButton } from "@/components/shared/BackButton";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'announcement' as 'coupon' | 'announcement' | 'promotion' | 'maintenance' | 'update',
    targetRoles: [] as ('host' | 'guest' | 'admin')[],
    couponCode: '',
    couponDiscount: '',
    couponValidUntil: '',
    couponMinSpend: '',
    actionUrl: '',
    expiresAt: ''
  });

  if (!user || userRole !== 'admin') {
    return <LoadingScreen />;
  }

  const handleRoleToggle = (role: 'host' | 'guest' | 'admin') => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.targetRoles.length === 0) {
      toast.error('Please select at least one target role');
      return;
    }

    if (formData.type === 'coupon') {
      if (!formData.couponCode || !formData.couponDiscount) {
        toast.error('Please provide coupon code and discount');
        return;
      }
    }

    setLoading(true);
    try {
      const eventId = await createPlatformEvent({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        targetRoles: formData.targetRoles,
        couponCode: formData.type === 'coupon' ? formData.couponCode : undefined,
        couponDiscount: formData.type === 'coupon' && formData.couponDiscount 
          ? parseFloat(formData.couponDiscount) 
          : undefined,
        couponValidUntil: formData.type === 'coupon' && formData.couponValidUntil
          ? formData.couponValidUntil
          : undefined,
        couponMinSpend: formData.type === 'coupon' && formData.couponMinSpend
          ? parseFloat(formData.couponMinSpend)
          : undefined,
        actionUrl: formData.actionUrl || undefined,
        expiresAt: formData.expiresAt || undefined,
        createdBy: user.uid,
        status: 'active'
      });

      // Send notifications to target users
      await sendEventNotifications(eventId);

      toast.success('Event created and notifications sent!');
      navigate('/admin/dashboard');
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(`Failed to create event: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BackButton to="/admin/dashboard" label="Back to Dashboard" />
          <div>
            <h1 className="text-3xl font-bold">Create Platform Event</h1>
            <p className="text-muted-foreground">Create events and notify users (e.g., coupon codes, announcements)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
                <CardDescription>Basic details about the event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Event Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Special Holiday Discount"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the event..."
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Event Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coupon">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          Coupon Code
                        </div>
                      </SelectItem>
                      <SelectItem value="announcement">
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4" />
                          Announcement
                        </div>
                      </SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Target Audience */}
            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>Select which users should receive this event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Target Roles <span className="text-destructive">*</span></Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="target-host"
                        checked={formData.targetRoles.includes('host')}
                        onCheckedChange={() => handleRoleToggle('host')}
                      />
                      <Label htmlFor="target-host" className="cursor-pointer">Hosts</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="target-guest"
                        checked={formData.targetRoles.includes('guest')}
                        onCheckedChange={() => handleRoleToggle('guest')}
                      />
                      <Label htmlFor="target-guest" className="cursor-pointer">Guests</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="target-admin"
                        checked={formData.targetRoles.includes('admin')}
                        onCheckedChange={() => handleRoleToggle('admin')}
                      />
                      <Label htmlFor="target-admin" className="cursor-pointer">Admins</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coupon Details (if type is coupon) */}
            {formData.type === 'coupon' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Coupon Details
                  </CardTitle>
                  <CardDescription>Configure the coupon code to distribute</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="couponCode">
                      Coupon Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="couponCode"
                      value={formData.couponCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                      placeholder="e.g., HOLIDAY2025"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couponDiscount">
                      Discount Amount (₱) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="couponDiscount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.couponDiscount}
                      onChange={(e) => setFormData(prev => ({ ...prev, couponDiscount: e.target.value }))}
                      placeholder="e.g., 100"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couponValidUntil">
                      Valid Until
                    </Label>
                    <Input
                      id="couponValidUntil"
                      type="datetime-local"
                      value={formData.couponValidUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, couponValidUntil: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couponMinSpend">
                      Minimum Purchase (₱)
                    </Label>
                    <Input
                      id="couponMinSpend"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.couponMinSpend}
                      onChange={(e) => setFormData(prev => ({ ...prev, couponMinSpend: e.target.value }))}
                      placeholder="e.g., 500"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Options */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="actionUrl">Action URL (Optional)</Label>
                  <Input
                    id="actionUrl"
                    value={formData.actionUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
                    placeholder="e.g., /guest/wallet or /guest/listings"
                  />
                  <p className="text-xs text-muted-foreground">
                    Where users should be redirected when they click the event notification
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Event Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4 mr-2" />
                    Create Event & Send Notifications
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;

