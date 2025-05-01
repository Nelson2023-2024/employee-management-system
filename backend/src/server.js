import express from "express"
import  { configDotenv } from "dotenv"
import { authRoutes } from "./routes/auth.route.js"
configDotenv()

const PORT = process.env.PORT || 5005

const app = express()

app.use(express.json())
app.use("/api/auth", authRoutes)
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})