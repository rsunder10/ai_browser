import { useState } from 'react';


interface OmnibarProps {
    onNavigate: (url: string) => void;
}

export default function Omnibar({ onNavigate }: OmnibarProps) {
    const [input, setInput] = useState('');

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (input.startsWith('/ai ')) {
                const prompt = input.slice(4);
                const response = await window.electron.invoke('ai_query', { provider: 'local', prompt });
                console.log(response);
                alert(response);
            } else {
                onNavigate(input);
            }
        }
    };

    return (
        <div className="w-full p-4 bg-gray-800 border-b border-gray-700 flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter URL or /ai command..."
                className="flex-1 p-2 rounded bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button onClick={() => onNavigate(input)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                Go
            </button>
        </div>
    );
}
