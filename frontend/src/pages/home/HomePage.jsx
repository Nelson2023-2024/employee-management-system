import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Calendar, Building2, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';

const HomePage = () => {
  // Fetch dashboard stats
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5005/api/admin-dashboard/dashboard-stats", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      return response.json();
    },
  });

  // Helper function to format percentage change
  const formatPercentageChange = (change) => {
    if (change === 0) return "No change";
    const isPositive = change > 0;
    return `${isPositive ? '+' : ''}${change.toFixed(1)}% from last month`;
  };

  // Helper function to get trend icon
  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <Card className="border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600">Error loading dashboard data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalEmployees || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {getTrendIcon(dashboardStats?.totalEmployeesPercentageChange)}
              <span className={dashboardStats?.totalEmployeesPercentageChange > 0 ? "text-green-600" : 
                             dashboardStats?.totalEmployeesPercentageChange < 0 ? "text-red-600" : ""}>
                {formatPercentageChange(dashboardStats?.totalEmployeesPercentageChange || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Present Today Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Present Today
            </CardTitle>
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.presentToday || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {dashboardStats?.attendanceRate?.toFixed(1) || 0}% attendance rate
            </div>
            <div className="text-xs text-muted-foreground">
              No change
            </div>
          </CardContent>
        </Card>

        {/* On Leave Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Leave
            </CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.onLeave || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {((dashboardStats?.onLeave || 0) / (dashboardStats?.totalEmployees || 1) * 100).toFixed(1)}% of workforce
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(dashboardStats?.onLeavePercentageChange)}
              <span className={dashboardStats?.onLeavePercentageChange > 0 ? "text-green-600" : 
                             dashboardStats?.onLeavePercentageChange < 0 ? "text-red-600" : ""}>
                {formatPercentageChange(dashboardStats?.onLeavePercentageChange || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Departments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Departments
            </CardTitle>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalDepartments || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Active departments
            </div>
            <div className="text-xs text-muted-foreground">
              No change
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leave Requests
            </CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalLeaveRequests || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Total requests
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(dashboardStats?.leaveRequestsPercentageChange)}
              <span className={dashboardStats?.leaveRequestsPercentageChange > 0 ? "text-green-600" : 
                             dashboardStats?.leaveRequestsPercentageChange < 0 ? "text-red-600" : ""}>
                {formatPercentageChange(dashboardStats?.leaveRequestsPercentageChange || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats?.attendanceRate?.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Today's performance
            </div>
            <div className="text-xs text-muted-foreground">
              No change
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;