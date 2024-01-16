import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
   origin: process.env.CORS_ORIGIN,
   credentials: true
}))

//For allwoing limit of data in request
app.use(express.json({
   limit: "16kb"
}));

// For allowing url encoded data in request
app.use(express.urlencoded({
   extended: true,
   limit: "16kb"
}))

// For serving/storing temprory static files
app.use(express.static("public"));

// For parsing cookies or applying CURD operations on client side
app.use(cookieParser());

// Routes starts here
import userRouter from "./routes/user.routes.js";

// Mounting routes with middleware, app.use() is used to mount middleware 
//instead of app.get() or app.post()
app.use("/api/v1/users", userRouter);

// Routes ends here
export {app}