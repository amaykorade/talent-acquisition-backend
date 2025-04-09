import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import mammoth from 'mammoth';

dotenv.config();

const upload = multer({ dest: 'uploads/' });

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

async function sendToGemini(text) {
    const prompt = `
You are a resume parser. Extract the following information from this resume and return the result strictly in JSON format:
- Full Name
- Summary
- Work Experience (include company name, position, duration, and key points)
- Skills (categorize into: Programming Languages, Databases, Developer Tools, Frameworks, Additional Skills, Soft Skills)
- LinkedIn URL
- GitHub URL
- Portfolio URL

Resume content:
"""
${text}
"""
Return JSON only, without any explanation or markdown formatting.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        }),
    });

    const data = await response.json();
    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Remove ```json and ``` from the beginning and end
    textResponse = textResponse.replace(/^```json\n/, "").replace(/\n```$/, "");

    try {
        const parsed = JSON.parse(textResponse);
        return parsed;
    } catch (err) {
        console.error("Failed to parse JSON from Gemini:", err);
        return null;
    }
}





app.post("/parse-resume", upload.single("resume"), async (req, res) => {
    const filePath = req.file.path;

    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const resumeText = result.value;

        // Send to Gemini
        const structuredData = await sendToGemini(resumeText);

        // Cleanup
        fs.unlinkSync(filePath);

        res.status(200).json({ message: "Resume parsed successfully", data: structuredData });
    } catch (err) {
        console.error("Error processing resume:", err);
        res.status(500).json({ error: "Failed to parse resume" });
    }
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