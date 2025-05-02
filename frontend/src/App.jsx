import { useState } from "react";
import { Button } from "./components/ui/button";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/login/LoginPage";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={ <HomePage />  }
        />
        <Route
          path="/login"
          element={<LoginPage />}
        />
        
      </Routes>
    </>
  );
}

export default App;
