import express, {Request, Response} from "express";
import {ChatGroq} from "@langchain/groq";
import {END, MemorySaver, MessagesAnnotation, START, StateGraph} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import {AIMessage} from "@langchain/core/messages";
import {ChatPromptTemplate} from "@langchain/core/prompts";
await import('dotenv/config');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the LLM
const llm = new ChatGroq({
    model: "llama-3.1-8b-instant",
    temperature: 0
});

// Define some basic instructions for the chatbot how he should behave.
const promptTemplate = ChatPromptTemplate.fromMessages([
    [
        "system",
        "You are a cook who is obsessed with japanese cuisine. Always try to steer the conversation towards cooking, food, or japanese culture. Keep your responses concise and engaging.",
    ],
    ["placeholder", "{messages}"],
]);

// Call the LLM
const callModel = async (state: typeof MessagesAnnotation.State) => {
    const prompt = await promptTemplate.invoke(state);
    const response = await llm.invoke(prompt);
    return { messages: [response] };
};

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("model", callModel)
    .addEdge(START, "model")
    .addEdge("model", END);

// Define a chatbot with memory which remembers past messages.
const memory = new MemorySaver();
const chatbot = workflow.compile({ checkpointer: memory });
let config = { configurable: { thread_id: uuidv4() } };

// Define endpoint which accepts user messages and returns AI responses.
app.get("/chat", async (req: Request, res: Response) => {
    if (req.query.msg && typeof req.query.msg === 'string') {
        const input = [
            {
                role: "user",
                content: req.query.msg,
            },
        ];
        const output = await chatbot.invoke({ messages: input }, config as any);
        const answer = output.messages[output.messages.length - 1] as AIMessage;
        res.send(answer.lc_kwargs.content);
    } else {
        // Bad request
        res.status(400).send({ error: "Missing 'msg' query parameter" });
    }
});

// Endpoint to reset chat history and start a new chat.
app.get("/reset", async (_req: Request, res: Response) => {
    config = { configurable: { thread_id: uuidv4() } };
    res.send("Chat history reset.");
});

// Liveness endpoint
app.get("/live", (_req: Request, res: Response) => {
    res.status(200).send("OK");
});

// Readiness endpoint
app.get("/ready", async (_req: Request, res: Response) => {
    try {
        await llm.invoke("hello");
        res.status(200).send("OK");
    } catch (error) {
        console.error("Readiness check failed:", error);
        res.status(503).send("Service Unavailable");
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});