import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AvailabilityCalendarProps {
  availableDates?: string[];
  blockedDates?: string[];
  onUpdateDates?: (available: string[], blocked: string[]) => void;
  readOnly?: boolean;
}

export const AvailabilityCalendar = ({
  availableDates = [],
  blockedDates = [],
  onUpdateDates,
  readOnly = false
}: AvailabilityCalendarProps) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [mode, setMode] = useState<'available' | 'blocked'>('available');

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || readOnly) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const newAvailable = mode === 'available' 
      ? [...availableDates, dateStr]
      : availableDates.filter(d => d !== dateStr);
    const newBlocked = mode === 'blocked'
      ? [...blockedDates, dateStr]
      : blockedDates.filter(d => d !== dateStr);
    
    onUpdateDates?.(newAvailable, newBlocked);
    toast.success(`Date marked as ${mode}`);
  };

  const isDateBlocked = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return blockedDates.includes(dateStr);
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availableDates.includes(dateStr);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Calendar</CardTitle>
        {!readOnly && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={mode === 'available' ? 'default' : 'outline'}
              onClick={() => setMode('available')}
            >
              Mark Available
            </Button>
            <Button
              size="sm"
              variant={mode === 'blocked' ? 'default' : 'outline'}
              onClick={() => setMode('blocked')}
            >
              Mark Blocked
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDates[0]}
          onSelect={handleDateSelect}
          disabled={(date) => readOnly && isDateBlocked(date)}
          modifiers={{
            booked: (date) => isDateBlocked(date),
            available: (date) => isDateAvailable(date)
          }}
          modifiersStyles={{
            booked: { backgroundColor: '#ef4444', color: 'white' },
            available: { backgroundColor: '#22c55e', color: 'white' }
          }}
          className="rounded-md border"
        />
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Available dates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Blocked dates</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
