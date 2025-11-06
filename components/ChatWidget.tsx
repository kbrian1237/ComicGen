import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getChatResponse } from '../services/geminiService';
import ChatIcon from './icons/ChatIcon';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import LoadingSpinner from './LoadingSpinner';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      id: Date.now(),
      text: userInput,
      sender: 'user',
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const botResponseText = await getChatResponse(userInput);
      const newBotMessage: ChatMessage = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, newBotMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ${isOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <button
          onClick={toggleChat}
          className="bg-cyan-600 text-white p-4 rounded-full shadow-lg hover:bg-cyan-700 transition-transform transform hover:scale-110"
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>

      <div className={`fixed bottom-5 right-5 w-full max-w-sm h-[70vh] max-h-[600px] z-50 flex flex-col bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-2xl">
          <h3 className="text-lg font-bold text-cyan-400">Comic Assistant</h3>
          <button onClick={toggleChat} className="text-gray-400 hover:text-white" aria-label="Close chat">
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                  <p className="text-sm break-words">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 rounded-2xl rounded-bl-none p-4">
                  <LoadingSpinner className="w-5 h-5" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
          <div className="relative flex items-center">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask anything..."
              className="w-full pl-4 pr-12 py-2 bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-cyan-600 text-white p-2 rounded-full disabled:bg-gray-500 hover:bg-cyan-700 transition-colors"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatWidget;
