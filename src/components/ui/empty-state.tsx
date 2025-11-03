import React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeInUp">
    <div className="mb-6 w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">{description}</p>
    {action}
  </div>
);

