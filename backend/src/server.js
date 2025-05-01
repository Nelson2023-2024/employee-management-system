import express from "express"
import  { configDotenv } from "dotenv"
import { authRoutes } from "./routes/auth.route.js"
import { connectToDB } from "./lib/db.js"
import { departmentRoutes } from "./routes/deparment.route.js"
configDotenv()

const PORT = process.env.PORT || 5005

const app = express()

app.use(express.json())
app.use("/api/auth", authRoutes)
app.use("/api/department", departmentRoutes)
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connectToDB()
})