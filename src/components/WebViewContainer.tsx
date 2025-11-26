interface WebViewContainerProps {
    url: string;
}

export default function WebViewContainer({ url }: WebViewContainerProps) {
    return (
        <div className="flex-1 w-full h-full bg-white relative flex flex-col">
            <div className="bg-green-100 text-green-800 text-xs p-2 text-center border-b border-green-200">
                ℹ️ <strong>Single Window Mode:</strong> Navigation loads content in the native webview below.
                This iframe is a placeholder.
            </div>
            <iframe
                src={url}
                className="w-full h-full border-none"
                title="Browser View"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            />
        </div>
    );
}
