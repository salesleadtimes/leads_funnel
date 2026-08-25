'use client';

import { TrendingUp, TrendingDown, IndianRupee, Target, BarChart3, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, fmtINR } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor?: string;
  trend?: { value: number; label: string };
  className?: string;
}


export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = '#0091D5',
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('relative overflow-hidden group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {title}
            </p>
            <p
              className="text-2xl font-mono font-bold tracking-tight text-foreground"
              style={{ lineHeight: 1.2 }}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.value >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div
              className="rounded-xl p-2.5 opacity-90 shrink-0"
              style={{ background: accentColor + '18' }}
            >
              <Icon className="h-5 w-5" style={{ color: accentColor }} />
            </div>
          )}
        </div>
      </CardContent>
      {/* Accent bottom bar */}
      <div
        className="absolute bottom-0 left-0 w-full h-[3px] transition-all duration-300 group-hover:h-1"
        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }}
      />
    </Card>
  );
}
