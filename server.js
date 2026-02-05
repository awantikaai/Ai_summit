import express from "express";
import dotenv from "dotenv";
import AuthRoutes from './Route/AuthRoutes.js'
dotenv.config({ path: "./.env" });

const app = express();
const PORT = process.env.PORT 

app.use(express.json());            
app.use(express.urlencoded({ extended: true })); 


app.use('/hackathon' , AuthRoutes)

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(PORT, () => {
  console.log(`your server is running on ${PORT}`);
});
