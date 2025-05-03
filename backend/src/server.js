import express from "express"
import cookieParser from "cookie-parser"
import cors from 'cors';
import  { configDotenv } from "dotenv"
import { authRoutes } from "./routes/auth.route.js"
import { connectToDB } from "./lib/db.js"
import { departmentRoutes } from "./routes/deparment.route.js"
import { adminEmployeeRoutes } from "./routes/admin.user.route.js";
import { adminLeaveRoutes } from "./routes/admin.leave.route.js";
import { leaveRoutes } from "./routes/leave.route.js";
configDotenv()

const PORT = process.env.PORT || 5005

const app = express()
app.use(cors())

app.use(cookieParser())


app.use(express.json())
app.use("/api/auth", authRoutes)
app.use("/api/department", departmentRoutes)
app.use("/api/admin-mangage-employee", adminEmployeeRoutes)
app.use("/api/admin-mangage-leave", adminLeaveRoutes)
app.use("/api/leave", leaveRoutes)
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connectToDB()
})