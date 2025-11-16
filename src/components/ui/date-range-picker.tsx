import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateRangePickerProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (value: { from: Date | undefined; to: Date | undefined }) => void;
  placeholder?: string;
  className?: string;
  disabled?: (date: Date) => boolean;
  error?: boolean;
  modifiers?: {
    [key: string]: (date: Date) => boolean;
  };
  modifiersClassNames?: {
    [key: string]: string;
  };
  classNames?: {
    [key: string]: string;
  };
  numberOfMonths?: number;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled,
  error,
  modifiers,
  modifiersClassNames,
  classNames,
  numberOfMonths = 1,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      // Automatically sort dates: earlier date becomes 'from', later date becomes 'to'
      let sortedRange = range;
      if (range.from && range.to) {
        const fromTime = range.from.getTime();
        const toTime = range.to.getTime();
        
        // If 'to' is earlier than 'from', swap them
        if (toTime < fromTime) {
          sortedRange = {
            from: range.to,
            to: range.from
          };
        }
      }
      
      onChange?.(sortedRange);
      // Close popover when both dates are selected
      if (sortedRange.from && sortedRange.to) {
        setOpen(false);
      }
    } else {
      onChange?.(range);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDisabled = disabled || ((date: Date) => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly < today;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "LLL dd, y")} -{" "}
                {format(value.to, "LLL dd, y")}
              </>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from || today}
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          disabled={isDisabled}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          classNames={classNames}
        />
      </PopoverContent>
    </Popover>
  );
}
