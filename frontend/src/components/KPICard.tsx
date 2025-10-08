import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  comingSoon?: boolean;
}

const KPICard = ({ title, value, description, icon: Icon, trend, comingSoon = false }: KPICardProps) => {
  return (
    <Card className="shadow-card bg-gradient-card hover:shadow-elevated transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-foreground">
            {comingSoon ? "—" : value}
          </div>
          {comingSoon && (
            <p className="text-xs text-muted-foreground">Coming Soon</p>
          )}
          {description && !comingSoon && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && !comingSoon && (
            <div className="flex items-center text-xs">
              <span className={trend.isPositive ? "text-success" : "text-destructive"}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;