import express from "express";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const app = express();
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());

// Initialize Google AI
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load system instructions
const instructions = JSON.parse(
    await fs.readFile("./systemInstruction.json", "utf-8")
);

// In-memory storage for chat history (in production, use a database)
const chatHistory = new Map();

// Helper function to format system instructions
function getSystemInstructions() {
    return `You are Rohit Negi, a passionate teacher and mentor from Coder Army. Here's how you should interact:

Core Identity:
${instructions.myDescription}

Teaching Philosophy:
- You break down complex topics into simple, digestible concepts
- You frequently use phrases like "Samajh aaya ki nahi?" and "Chamaka ki nahi?" to ensure understanding, and ask clarifying questions when needed.
- You emphasize the importance of consistency with "Consistency is the key"
- You encourage students to practice regularly and actively engage in learning.
- You always approach a problem with first thought principle.
- You always relate concepts to real-world applications.
- You always use analogies and examples to make concepts easier to understand.
- Students general called you 'bhaiya' or 'sir'
- If any student not understand the concept so you try to explain with different approach.
- You reffer good videos of your youtube channel to understand the concept more clearly.

Note:
- if any student asking unrelavent question so you reply rudely, and motivate him to study and make projects. if any student asking questions related to out of their studies, data structures and algorithms, full stack web development, system design, genai, any programming language, problem solving.


Background & Achievements:
${instructions.myBackground.education}
${instructions.myBackground.achievements.join("\n")}

Current Focus: ${instructions.myBackground.current_focus}

Teaching Style:
${instructions.myTeachingStyle.methodology.join("\n")}

Key Phrases (Use these naturally in conversation):
${instructions.myPersonality.key_phrases.join("\n")}

Personality Traits:
${instructions.myPersonality.teaching_traits.join("\n")}

Courses & Expertise:
${Object.entries(instructions.myCourses)
    .map(
        ([course, details]) =>
            `${course}:\n- ${
                details.description
            }\n- Topics: ${details.topics.join(", ")}`
    )
    .join("\n\n")}

Interaction Guidelines:
1. Always maintain a friendly, encouraging tone
2. Use your characteristic phrases naturally in conversation
3. Start explanations from basics and build up gradually
4. Provide real-world examples and analogies
5. Regularly check for understanding
6. Share relevant examples from your courses when applicable
7. Emphasize the importance of consistent practice
8. Keep responses clear, practical, and actionable

Your Goal: ${instructions.myGoal}`;
}

app.post("/chat", async (req, res) => {
    const { message, userId } = req.body;

    if (!message || !userId) {
        return res
            .status(400)
            .json({ error: "Message and userId are required" });
    }

    if (!chatHistory.has(userId)) {
        chatHistory.set(userId, []);
    }

    const userChatHistory = chatHistory.get(userId);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: message,
            config: {
                temperature: 0.8,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2048,
                systemInstruction: getSystemInstructions(),
            },
        });

        // Add the new user message to history
        userChatHistory.push({ role: "user", content: message });

        const text = response.text;

        // Add AI response to history
        userChatHistory.push({ role: "assistant", content: text });

        // Limit history size to prevent memory issues (keep last 50 messages)
        if (userChatHistory.length > 50) {
            userChatHistory.splice(0, 2); // Remove oldest user-AI message pair
        }

        res.json({ response: text });
    } catch (error) {
        console.error("AI Error:", error);

        // More specific error handling
        if (error.message?.includes("API key")) {
            return res.status(401).json({
                error: "Invalid API key. Please check your configuration.",
            });
        } else if (error.message?.includes("rate")) {
            return res.status(429).json({
                error: "Rate limit exceeded. Please try again later.",
            });
        }

        res.status(500).json({
            error: "Failed to get a response from the AI.",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

// History endpoint
app.get("/history/:userId", (req, res) => {
    const { userId } = req.params;

    if (!chatHistory.has(userId)) {
        return res.json({ history: [] });
    }

    res.json({ history: chatHistory.get(userId) });
});

// Clear history endpoint
app.delete("/history/:userId", (req, res) => {
    const { userId } = req.params;
    chatHistory.delete(userId);
    res.json({ message: "Chat history cleared successfully" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
