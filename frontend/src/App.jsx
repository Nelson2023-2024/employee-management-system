import { useState } from "react";
import { Button } from "./components/ui/button";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/login/LoginPage";
import Sidebar from "./components/sidebar/SideBar";
import { useAuth } from "./hooks/useAuth";

function App() {

  const {data} = useAuth()
  console.log("data:", data);
  return (
    <div className="flex h-screen w-full">
      <Sidebar />

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
