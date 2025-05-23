import { useTheme } from "../../components/theme-provider";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useLogout } from "../../hooks/useLogout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

// Import icons from Lucide React instead of various sources
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  DollarSign, 
  Settings, 
  LogOut, 
  DoorOpen,
  Bell
} from "lucide-react";

const Sidebar = () => {
  const { setTheme, theme } = useTheme();
  const { logout, isLoading } = useLogout();

  // Get auth user data
  const { data: authUser } = useQuery({
    queryKey: ["authUser"],
  });

  function handleLogout(event) {
    event.preventDefault();
    console.log("Logout button clicked");
    logout();
  }

  // Navigation items
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/", active: true },
    { icon: Users, label: "Employees", path: "/employees" },
    { icon: CalendarCheck, label: "Attendance", path: "/attendance" },
    { icon: DoorOpen, label: "Leave", path: "/leave" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ];

  return (
    <div className="bg-background w-64 h-screen flex-shrink-0 border-r border-border">
      <div className="flex flex-col h-full p-4">
        {/* Logo/Header */}
        <div className="mb-8">
          <Link to="/" className="flex items-center">
            <h1 className="text-xl font-bold text-primary">AEMS Admin</h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                    item.active 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent text-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User profile and theme toggle */}
        <div className="mt-auto space-y-3">
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full justify-start"
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4 mr-2" />
            ) : (
              <MoonIcon className="h-4 w-4 mr-2" />
            )}
            {theme === "dark" ? "Light" : "Dark"} Mode
          </Button>

          {/* User Profile */}
          {authUser && (
            <Link
              to="/profile"
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={authUser?.profileImg || "/avatar-placeholder.png"}
                  alt={authUser?.fullName}
                />
                <AvatarFallback>
                  {authUser?.fullName?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {authUser?.fullName || "Admin"}
                </span>
              </div>
            </Link>
          )}

          {/* Logout Button */}
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;