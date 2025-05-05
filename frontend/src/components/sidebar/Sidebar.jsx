import { MdHomeFilled } from "react-icons/md";
import { IoNotifications } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "../../components/theme-provider";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { cn } from "../../lib/utils"; // Make sure you have this utility

const Sidebar = () => {
  const { setTheme, theme } = useTheme();

  // Placeholder data (replace with actual data)
  const authUser = {
    fullName: "John Doe",
    username: "johndoe",
    profileImg: "/avatars/boy1.png",
  };

  const { mutate: logout } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Something went wrong");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Logged out successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleLogout(event) {
    event.preventDefault();
    logout();
  }

  // Custom NavItem component for consistent styling and hover effects
  const NavItem = ({ to, icon: Icon, label, active = false }) => (
    <li>
      <Link
        to={to}
        className={cn(
          "group flex justify-center md:justify-start items-center gap-3 px-3 py-2 rounded-md relative",
          "transition-all duration-300 ease-in-out",
          "hover:text-primary",
          active ? "text-primary" : "text-foreground"
        )}
      >
        {/* Background hover effect */}
        <div className="absolute inset-0 bg-accent/50 opacity-0 rounded-md group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Active indicator */}
        <div className={cn(
          "absolute left-0 w-1 h-6 rounded-full bg-primary transform transition-all duration-300",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
        )} />
        
        {/* Icon with subtle scale effect on hover */}
        <div className="relative z-10 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Label with slide effect */}
        <span className="text-sm font-medium hidden md:block relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">{label}</span>
      </Link>
    </li>
  );

  return (
    <div className="w-20 md:w-60 flex-shrink-0 border-r border-border bg-secondary transition-all duration-300">
      <div className="sticky top-0 left-0 h-screen flex flex-col p-4 md:p-6">
        <Link to="/" className="flex justify-center md:justify-start mb-6 group">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white font-bold transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
            JS
          </div>
        </Link>
        
        <ul className="flex flex-col gap-3">
          <NavItem to="/" icon={MdHomeFilled} label="Home" active={false} />
          <NavItem to="/notifications" icon={IoNotifications} label="Notifications" />
          <NavItem to={`/profile/${authUser?.username}`} icon={FaUser} label="Profile" />
        </ul>

        <div className="mt-auto flex flex-col gap-y-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full md:w-auto justify-center md:justify-start group hover:bg-accent/70 transition-all duration-300"
          >
            <div className="relative z-10  flex items-center gap-2">
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              <span className="sr-only md:not-sr-only md:transform ">
                {theme === "dark" ? "Light" : "Dark"} Mode
              </span>
            </div>
          </Button>
          
          {authUser && (
            <Link
              to={`/profile/${authUser?.username}`}
              className="group flex gap-2 items-center transition-all duration-300 hover:bg-accent/50 rounded-md py-2 px-3 relative"
            >
              {/* Subtle hover background */}
              <div className="absolute inset-0 bg-accent/30 opacity-0 rounded-md group-hover:opacity-100 transition-opacity duration-300" />
              
              <Avatar className="w-8 h-8 relative z-10 ring-0 group-hover:ring-2 ring-primary/30 transition-all duration-300">
                <AvatarImage src={authUser?.profileImg || "/avatar-placeholder.png"} alt={authUser?.fullName} />
                <AvatarFallback>{authUser?.fullName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col text-left hidden md:block relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">
                <p className="text-sm font-semibold">{authUser?.fullName}</p>
                <p className="text-xs text-muted-foreground">{authUser?.username}</p>
              </div>
            </Link>
          )}
          
          <Button
            variant="outline"
            size="icon"
            className="w-full md:w-auto justify-center md:justify-start group  transition-all duration-300 cursor-pointer"
            onClick={handleLogout}
          >
            <div className="relative z-10  flex items-center gap-2 ">
              <BiLogOut className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:transform ">
                Logout
              </span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;