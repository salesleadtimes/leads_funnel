import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground border-border',
        govt: 'border-transparent bg-[#2C3E70]/12 text-[#2C3E70]',
        nongovt: 'border-transparent bg-[#0E8C7F]/12 text-[#0E8C7F]',
        won: 'border-transparent bg-[#1E8A5F]/15 text-[#1E8A5F]',
        lost: 'border-transparent bg-[#C0392B]/15 text-[#C0392B]',
        stage: 'border-transparent bg-muted text-muted-foreground',
        owner: 'border-[#FFC300]/30 bg-[#FFC300]/15 text-[#B8900A]',
        member: 'border-[#00AEEF]/25 bg-[#00AEEF]/10 text-[#006EA8]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
