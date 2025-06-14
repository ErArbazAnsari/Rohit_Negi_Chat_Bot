import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiMoon, FiSun } from "react-icons/fi";
import { FaPlay, FaPause } from "react-icons/fa";
import { MdDelete, MdContentCopy } from "react-icons/md";

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");
        return savedTheme || "light";
    });
    const [userId] = useState(() => {
        const savedUserId = localStorage.getItem("userId");
        if (savedUserId) return savedUserId;
        const newUserId = uuidv4();
        localStorage.setItem("userId", newUserId);
        return newUserId;
    });
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const currentUtterance = useRef(null);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const speakMessage = (text) => {
        try {
            if (!window.speechSynthesis) {
                console.error("Speech synthesis not supported in this browser");
                return;
            }

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            setIsSpeaking(true);

            const utterance = new SpeechSynthesisUtterance(text);
            currentUtterance.current = utterance;

            utterance.rate = 0.9;
            utterance.pitch = 1;

            utterance.onstart = () => {
                setIsSpeaking(true);
                console.log("Speech started");
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                console.log("Speech ended");
            };

            utterance.onerror = (event) => {
                setIsSpeaking(false);
                console.error("Speech error:", event);
            };

            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(
                (voice) =>
                    voice.name.includes("English") || voice.lang.includes("en")
            );

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Error in speech synthesis:", error);
            setIsSpeaking(false);
        }
    };

    const toggleSpeech = (text) => {
        if (isSpeaking) {
            window.speechSynthesis.pause();
            setIsSpeaking(false);
        } else {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setIsSpeaking(true);
            } else {
                speakMessage(text);
            }
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // You could add a toast notification here
                alert("Message copied to clipboard!");
            })
            .catch((err) => {
                console.error("Failed to copy text: ", err);
            });
    };

    // Initialize voices when component mounts
    useEffect(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => {
                const voices = window.speechSynthesis.getVoices();
                // console.log("Available voices:", voices);
            };
        }
    }, []);

    const cleanResponse = (text) => {
        return text
            .replace(/\n{3,}/g, "\n\n") // Replace 3 or more newlines with 2
            .replace(/\s+$/gm, "") // Remove trailing whitespace from each line
            .trim(); // Remove leading/trailing whitespace
    };

    const renderMessageContent = (content) => {
        const cleanedContent = cleanResponse(content);
        const isMarkdown = /[#*`_>-]/.test(cleanedContent);

        if (isMarkdown) {
            return (
                <ReactMarkdown
                    components={{
                        code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                                className || ""
                            );
                            return !inline && match ? (
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-lg my-4"
                                    showLineNumbers={true}
                                    wrapLines={true}
                                    wrapLongLines={true}
                                    customStyle={{
                                        margin: 0,
                                        padding: "1rem",
                                        fontSize: "0.875rem",
                                        lineHeight: "1.5",
                                        wordWrap: "break-word",
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "break-word",
                                    }}
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code
                                    className={`${
                                        theme === "light"
                                            ? "bg-gray-100 text-gray-800"
                                            : "bg-gray-700 text-gray-200"
                                    } px-1.5 py-0.5 rounded text-sm font-mono break-words`}
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        },
                        pre({ children }) {
                            return <div className="my-4">{children}</div>;
                        },
                        p({ children }) {
                            return (
                                <p className="mb-4 leading-relaxed">
                                    {children}
                                </p>
                            );
                        },
                        ul({ children }) {
                            return (
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    {children}
                                </ul>
                            );
                        },
                        ol({ children }) {
                            return (
                                <ol className="list-decimal pl-6 mb-4 space-y-2">
                                    {children}
                                </ol>
                            );
                        },
                        li({ children }) {
                            return <li className="mb-1">{children}</li>;
                        },
                        h1({ children }) {
                            return (
                                <h1 className="text-2xl font-bold mb-4 mt-6">
                                    {children}
                                </h1>
                            );
                        },
                        h2({ children }) {
                            return (
                                <h2 className="text-xl font-bold mb-3 mt-5">
                                    {children}
                                </h2>
                            );
                        },
                        h3({ children }) {
                            return (
                                <h3 className="text-lg font-bold mb-2 mt-4">
                                    {children}
                                </h3>
                            );
                        },
                        blockquote({ children }) {
                            return (
                                <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic">
                                    {children}
                                </blockquote>
                            );
                        },
                    }}
                >
                    {cleanedContent}
                </ReactMarkdown>
            );
        }

        return (
            <p className="whitespace-pre-wrap break-words">{cleanedContent}</p>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput("");
        const timestamp = new Date().toLocaleTimeString();
        setMessages((prev) => [
            ...prev,
            { role: "user", content: userMessage, timestamp },
        ]);
        setIsLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_SERVER}/chat`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        userId: userId,
                    }),
                }
            );

            const data = await response.json();
            // console.log("Server Response:", data);

            if (response.ok) {
                const assistantMessage = {
                    role: "assistant",
                    content:
                        data.response ||
                        "I received your message but couldn't process it properly.",
                    timestamp: new Date().toLocaleTimeString(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error(data.error || "Failed to get response");
            }
        } catch (error) {
            console.error("Error:", error);
            const errorMessage = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date().toLocaleTimeString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            await fetch(
                `${import.meta.env.VITE_BACKEND_SERVER}/history/${userId}`,
                {
                    method: "DELETE",
                }
            );
            setMessages([]);
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } catch (error) {
            console.error("Error clearing history:", error);
        }
    };

    return (
        <div
            className={`min-h-screen transition-colors duration-200 ${
                theme === "light"
                    ? "bg-gradient-to-br from-blue-50 to-indigo-100"
                    : "bg-gradient-to-br from-gray-900 to-gray-800"
            } flex flex-col`}
        >
            {/* Fixed Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 ${
                    theme === "light"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                        : "bg-gradient-to-r from-gray-800 to-gray-900"
                } text-white shadow-lg backdrop-blur-sm bg-opacity-95`}
            >
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/rohit_negi.jpg"
                            alt="Rohit Negi"
                            className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                        />
                        <div>
                            <h1 className="text-2xl font-bold">
                                Talk with Rohit Negi
                            </h1>
                            <p
                                className={`text-sm ${
                                    theme === "light"
                                        ? "text-blue-100"
                                        : "text-gray-300"
                                }`}
                            >
                                Your Programming Mentor
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-full transition-all duration-300 transform hover:scale-110 ${
                                theme === "light"
                                    ? "bg-gray-800 text-white hover:bg-gray-700"
                                    : "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                            } shadow-md hover:shadow-lg`}
                            title={`Switch to ${
                                theme === "light" ? "dark" : "light"
                            } theme`}
                        >
                            {theme === "light" ? (
                                <FiMoon className="w-5 h-5" />
                            ) : (
                                <FiSun className="w-5 h-5" />
                            )}
                        </button>
                        <button
                            onClick={clearHistory}
                            className={`px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 ${
                                theme === "light"
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-red-600 hover:bg-red-700"
                            } text-white shadow-md hover:shadow-lg flex items-center space-x-2`}
                        >
                            <MdDelete className="w-5 h-5" />
                            <span>Clear Chat</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content with Header Spacing */}
            <div className="flex-1 container mx-auto p-4 flex flex-col max-w-4xl mt-20">
                <div
                    className={`flex-1 ${
                        theme === "light" ? "bg-white" : "bg-gray-800"
                    } rounded-2xl shadow-xl p-4 mb-4 overflow-y-auto`}
                >
                    {messages.length === 0 ? (
                        <div
                            className={`text-center ${
                                theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-400"
                            } mt-8`}
                        >
                            <div className="mb-4">
                                <img
                                    src="/rohit_negi.jpg"
                                    alt="Rohit Negi"
                                    className="w-24 h-24 rounded-full mx-auto border-4 border-blue-500"
                                />
                            </div>
                            <h2
                                className={`text-2xl font-semibold mb-2 ${
                                    theme === "light"
                                        ? "text-gray-700"
                                        : "text-gray-200"
                                }`}
                            >
                                Welcome to Chat with Rohit Negi!
                            </h2>
                            <p
                                className={
                                    theme === "light"
                                        ? "text-gray-600"
                                        : "text-gray-300"
                                }
                            >
                                Ask me anything about programming, DSA, or my
                                courses.
                            </p>
                            <div className="mt-6 space-y-2">
                                <p
                                    className={`text-sm ${
                                        theme === "light"
                                            ? "text-gray-500"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Try asking about:
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[
                                        "Tell me about your DSA course",
                                        "What's your teaching approach?",
                                        "How can I start learning programming?",
                                        "What programming languages do you teach?",
                                        "Do you offer any free resources?",
                                        "How to prepare for coding interviews?",
                                        "What's the best way to learn DSA?",
                                        "Tips for landing a tech job",
                                        "How to build a strong portfolio?",
                                        "Which projects should I work on?",
                                        "Explain time complexity",
                                        "What are data structures?",
                                        "How to solve array problems?",
                                        "Best practices for coding",
                                        "Common coding patterns",
                                        "Your journey in tech",
                                        "Challenges you faced",
                                        "Your favorite programming language",
                                        "Advice for beginners",
                                        "Your teaching philosophy",
                                    ].map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setInput(suggestion)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 transform hover:scale-105 ${
                                                theme === "light"
                                                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                                            }`}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`mb-4 flex ${
                                    message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >
                                <div
                                    className={`flex items-start space-x-2 max-w-[80%] ${
                                        message.role === "user"
                                            ? "flex-row-reverse space-x-reverse"
                                            : ""
                                    }`}
                                >
                                    {message.role === "assistant" && (
                                        <div className="flex flex-col items-center">
                                            <img
                                                src="/rohit_negi.jpg"
                                                alt="Rohit Negi"
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div className="flex space-x-2 mt-1">
                                                <button
                                                    onClick={() =>
                                                        toggleSpeech(
                                                            message.content
                                                        )
                                                    }
                                                    className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${
                                                        theme === "light"
                                                            ? "text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                            : "text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                                    }`}
                                                    title={
                                                        isSpeaking
                                                            ? "Pause"
                                                            : "Play"
                                                    }
                                                >
                                                    {isSpeaking ? (
                                                        <FaPause className="w-4 h-4" />
                                                    ) : (
                                                        <FaPlay className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            message.content
                                                        )
                                                    }
                                                    className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${
                                                        theme === "light"
                                                            ? "text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                            : "text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                                    }`}
                                                    title="Copy message"
                                                >
                                                    <MdContentCopy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <div
                                            className={`p-3 rounded-2xl ${
                                                message.role === "user"
                                                    ? theme === "light"
                                                        ? "bg-blue-600 text-white rounded-tr-none"
                                                        : "bg-blue-700 text-white rounded-tr-none"
                                                    : theme === "light"
                                                    ? "bg-gray-100 text-gray-800 rounded-tl-none"
                                                    : "bg-gray-700 text-gray-200 rounded-tl-none"
                                            } break-words whitespace-pre-wrap`}
                                        >
                                            {renderMessageContent(
                                                message.content
                                            )}
                                        </div>
                                        <span
                                            className={`text-xs ${
                                                theme === "light"
                                                    ? "text-gray-500"
                                                    : "text-gray-400"
                                            } mt-1 ${
                                                message.role === "user"
                                                    ? "text-right"
                                                    : "text-left"
                                            }`}
                                        >
                                            {message.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div
                            className={`flex items-center space-x-2 ${
                                theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-400"
                            }`}
                        >
                            <img
                                src="/rohit_negi.jpg"
                                alt="Rohit Negi"
                                className="w-8 h-8 rounded-full"
                            />
                            <div className="flex space-x-1">
                                <div
                                    className={`w-2 h-2 rounded-full animate-bounce ${
                                        theme === "light"
                                            ? "bg-gray-400"
                                            : "bg-gray-500"
                                    }`}
                                    style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                    className={`w-2 h-2 rounded-full animate-bounce ${
                                        theme === "light"
                                            ? "bg-gray-400"
                                            : "bg-gray-500"
                                    }`}
                                    style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                    className={`w-2 h-2 rounded-full animate-bounce ${
                                        theme === "light"
                                            ? "bg-gray-400"
                                            : "bg-gray-500"
                                    }`}
                                    style={{ animationDelay: "300ms" }}
                                ></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Rohit anything..."
                        className={`flex-1 p-3 rounded-full focus:outline-none focus:ring-2 transition-all ${
                            theme === "light"
                                ? "border border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                                : "border border-gray-600 bg-gray-700 text-white focus:border-blue-400 focus:ring-blue-900"
                        }`}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`px-6 py-3 rounded-full transition-colors shadow-md hover:shadow-lg disabled:shadow-none ${
                            theme === "light"
                                ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                                : "bg-blue-700 text-white hover:bg-blue-600 disabled:bg-blue-900"
                        }`}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

export default App;
