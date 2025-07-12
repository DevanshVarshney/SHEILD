'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BLEData } from '@/lib/ble';

interface BLEChartProps {
    dataHistory: BLEData[];
    currentValue: number;
    statistics: {
        average: number;
        min: number;
        max: number;
        count: number;
    };
    getSoundLevelColor: (value: number) => string;
    getSoundLevelProgress: (value: number) => number;
    formatValue: (value: number) => string;
}

export function BLEChart({
    dataHistory,
    currentValue,
    statistics,
    getSoundLevelColor,
    getSoundLevelProgress,
    formatValue,
}: BLEChartProps) {
    // Prepare chart data
    const chartData = useMemo(() => {
        return dataHistory.map((data, index) => ({
            x: index,
            y: data.value,
            timestamp: data.timestamp,
        }));
    }, [dataHistory]);

    // Get trend indicator
    const getTrendIndicator = () => {
        if (dataHistory.length < 2) return <Minus className="h-4 w-4 text-muted-foreground" />;

        const recent = dataHistory.slice(-5);
        const firstAvg = recent.slice(0, Math.floor(recent.length / 2)).reduce((sum, d) => sum + d.value, 0) / Math.floor(recent.length / 2);
        const secondAvg = recent.slice(Math.floor(recent.length / 2)).reduce((sum, d) => sum + d.value, 0) / (recent.length - Math.floor(recent.length / 2));

        if (secondAvg > firstAvg + 2) return <TrendingUp className="h-4 w-4 text-red-500" />;
        if (secondAvg < firstAvg - 2) return <TrendingDown className="h-4 w-4 text-green-500" />;
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    };

    // Get sound level status
    const getSoundLevelStatus = (value: number) => {
        if (value < 60) return { label: 'Safe', color: 'bg-green-500' };
        if (value < 85) return { label: 'Moderate', color: 'bg-yellow-500' };
        return { label: 'High', color: 'bg-red-500' };
    };

    const status = getSoundLevelStatus(currentValue);
    const progress = getSoundLevelProgress(currentValue);

    return (
        <div className="space-y-4">
            {/* Current Value Display */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                        <span>Current Sound Level</span>
                        <Badge className={status.color}>
                            {status.label}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Large Value Display */}
                    <div className="text-center">
                        <div className={`text-4xl font-bold ${getSoundLevelColor(currentValue)}`}>
                            {formatValue(currentValue)}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            {getTrendIndicator()}
                            <span className="text-sm text-muted-foreground">
                                {dataHistory.length > 0 ? 'Live data' : 'No data'}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>0 dBA</span>
                            <span>120 dBA</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                    </div>
                </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {statistics.average.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Average</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {statistics.min.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Minimum</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {statistics.max.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Maximum</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {statistics.count}
                            </div>
                            <div className="text-sm text-muted-foreground">Readings</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Simple Chart */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Recent Readings</CardTitle>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <div className="h-32 flex items-end justify-between gap-1">
                            {chartData.map((point, index) => {
                                const height = (point.y / 120) * 100; // Normalize to 120 dBA max
                                return (
                                    <div
                                        key={index}
                                        className="flex-1 bg-primary/20 rounded-t"
                                        style={{
                                            height: `${Math.max(height, 2)}%`,
                                            backgroundColor: `hsl(var(--primary) / ${0.3 + (height / 100) * 0.7})`,
                                        }}
                                        title={`${point.y.toFixed(1)} dBA`}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-muted-foreground">
                            <Activity className="h-8 w-8 mr-2" />
                            No data available
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 