import { useState } from "react";
import { Button } from "./components/ui/button";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/login/LoginPage";
import Sidebar from "./components/sidebar/SideBar";

function App() {
  const [count, setCount] = useState(0);
  // You can use this state to track sidebar width if needed
  const [sidebarWidth, setSidebarWidth] = useState(240); // Default width in pixels

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar - with fixed width class */}
      <div className="">
      
        <Sidebar/>
      </div>
      
      {/* Main Content - starts after sidebar */}
      <div className="flex-1 ">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;