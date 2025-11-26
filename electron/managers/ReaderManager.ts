
import { WebContents } from 'electron';

export class ReaderManager {
    private activeReaders = new Set<number>();

    constructor() { }

    isReaderActive(webContentsId: number): boolean {
        return this.activeReaders.has(webContentsId);
    }

    async toggleReaderMode(webContents: WebContents): Promise<boolean> {
        const id = webContents.id;

        if (this.activeReaders.has(id)) {
            // Exit reader mode by reloading the page
            webContents.reload();
            this.activeReaders.delete(id);
            return false;
        } else {
            // Enter reader mode
            const success = await this.activateReaderMode(webContents);
            if (success) {
                this.activeReaders.add(id);
            }
            return success;
        }
    }

    private async activateReaderMode(webContents: WebContents): Promise<boolean> {
        try {
            // Simple heuristic script to extract content and replace body
            const script = `
                (function() {
                    // 1. Try to find the main content
                    const selectors = ['article', 'main', '.post-content', '.article-body', '#content', '.content'];
                    let contentNode = null;
                    
                    for (const selector of selectors) {
                        const el = document.querySelector(selector);
                        if (el && el.innerText.length > 500) {
                            contentNode = el;
                            break;
                        }
                    }

                    // Fallback: find the p tag parent with the most text
                    if (!contentNode) {
                        const paragraphs = document.querySelectorAll('p');
                        let maxLen = 0;
                        let bestParent = null;
                        const parentScores = new Map();

                        paragraphs.forEach(p => {
                            const parent = p.parentElement;
                            if (parent) {
                                const currentScore = parentScores.get(parent) || 0;
                                parentScores.set(parent, currentScore + p.innerText.length);
                            }
                        });

                        for (const [parent, score] of parentScores) {
                            if (score > maxLen) {
                                maxLen = score;
                                bestParent = parent;
                            }
                        }
                        contentNode = bestParent || document.body;
                    }

                    // 2. Extract data
                    const title = document.title;
                    const contentHtml = contentNode.innerHTML;

                    // 3. Create Reader View HTML
                    const readerHtml = \`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <title>\${title} - Reader View</title>
                            <style>
                                body {
                                    font-family: 'Georgia', 'Times New Roman', serif;
                                    line-height: 1.6;
                                    color: #333;
                                    max-width: 800px;
                                    margin: 0 auto;
                                    padding: 40px 20px;
                                    background-color: #f9f9f9;
                                }
                                h1 {
                                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                                    font-size: 2.5em;
                                    margin-bottom: 0.5em;
                                    color: #111;
                                }
                                img {
                                    max-width: 100%;
                                    height: auto;
                                    border-radius: 8px;
                                    margin: 20px 0;
                                }
                                a { color: #0066cc; text-decoration: none; }
                                a:hover { text-decoration: underline; }
                                pre {
                                    background: #eee;
                                    padding: 15px;
                                    border-radius: 5px;
                                    overflow-x: auto;
                                }
                                blockquote {
                                    border-left: 4px solid #ccc;
                                    margin: 0;
                                    padding-left: 20px;
                                    color: #666;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>\${title}</h1>
                            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                            <div class="reader-content">
                                \${contentHtml}
                            </div>
                        </body>
                        </html>
                    \`;

                    // 4. Replace document
                    document.documentElement.innerHTML = readerHtml;
                    return true;
                })();
            `;

            await webContents.executeJavaScript(script);
            return true;
        } catch (error) {
            console.error('Failed to activate reader mode:', error);
            return false;
        }
    }
}
