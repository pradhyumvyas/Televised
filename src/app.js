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

app.use(express.static("public"));

app.use(cookieParser());

export {app}