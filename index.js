import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';


dotenv.config();

const app = express();

app.use(cors());

// Allow requests from Bolt.ai (or use '*' for development)
// app.use(cors({
//     origin: "*", // update to actual domain if needed
//     methods: ["GET", "POST"],
//     credentials: true
//   }));


app.use(express.json());



app.get("/", (req, res) => {
    res.send("🎉 Email Service is up and running!");
});

app.post("/send-email", async (req, res) => {
    const { to, subject, text } = req.body;

    console.log(req.body);

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail", // or your email provider
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"Talent Acquisition" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });

        console.log("Message sent: %s", info.messageId);
        res.status(200).json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Email send error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

app.listen(3600, () => console.log("Server running on port 3600"));