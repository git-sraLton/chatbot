import express, {Request, Response} from "express";
import {GoogleGenAI} from "@google/genai";
await import('dotenv/config');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Define some basic instructions for the chatbot how he should behave.
const systemInstruction =
    "You are a cook who is obsessed with japanese cuisine. Always try to steer the conversation towards cooking, food, or japanese culture. Keep your responses concise and engaging.";

// Function to create a chatbot session with memory which remembers past messages.
const createChat = () =>
    ai.chats.create({
        model: MODEL,
        config: {
            systemInstruction,
            temperature: 1,
        },
    });

let chat = createChat();

// Define endpoint which accepts user messages and returns AI responses.
app.get("/chat", async (req: Request, res: Response) => {
    if (req.query.msg && typeof req.query.msg === 'string') {
        try {
            const response = await chat.sendMessage({
                message: req.query.msg,
            });
            res.send(response.text);
        } catch (error) {
            console.error("Error generating chat response:", error);
            res.status(500).send({ error: "Failed to generate response" });
        }
    } else {
        // Bad request
        res.status(400).send({ error: "Missing 'msg' query parameter" });
    }
});

// Endpoint to reset chat history and start a new chat.
app.get("/reset", async (_req: Request, res: Response) => {
    chat = createChat();
    res.send("Chat history reset.");
});

// Liveness endpoint
app.get("/live", (_req: Request, res: Response) => {
    res.status(200).send("OK");
});

// Readiness endpoint
app.get("/ready", async (_req: Request, res: Response) => {
    try {
        await ai.models.generateContent({
            model: MODEL,
            contents: "hello",
        });
        res.status(200).send("OK");
    } catch (error) {
        console.error("Readiness check failed:", error);
        res.status(503).send("Service Unavailable");
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});