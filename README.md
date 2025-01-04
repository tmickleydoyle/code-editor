
# WIP

### TODO

- Support autocomplete outside of localhost
- Allows user to select LLM
- Code selection for autocomplete
- RAG for code in directory

# AI Code Editor Features

https://github.com/user-attachments/assets/93394956-c4b9-4a14-b2a2-a1effe9b9304

https://github.com/user-attachments/assets/1bf70d96-2937-43a2-8474-de64b7457c89

https://github.com/user-attachments/assets/a8734468-401a-45fe-8c1d-add675e4ee5c

https://github.com/user-attachments/assets/10f5ecc4-9566-4cfd-9fcc-6a6ddae64bb4

https://github.com/user-attachments/assets/c5f71674-d7eb-4816-99c6-55b9b4a732ca

https://github.com/user-attachments/assets/31a0780e-0e09-4014-ab1d-ecc5a7b3e620

## Features

- **Code Editing:** Supports editing Python code with line numbers.
- **Syntax Highlighting:** Uses `Prism.js` with a light theme.
- **Autocomplete:** Fetches code suggestions from an OpenAI API server based on the provided code.
- **Keyboard Shortcuts:**
  - Press `Alt` to fetch autocomplete suggestions.
  - Press `Tab` to insert suggestions into the editor.
  - Press `Escape` to clear suggestions.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tmickleydoyle/code-editor.git
   cd code-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open the application in your browser.
2. Edit Python code in the editor.
3. Press `Alt` to generate autocomplete suggestions.
4. Press `Tab` to merge the suggested code into your editor.

_Note: For autocomplete, run an Ollama server locally._

## Key Components

- **`CodeEditor` Component:** Handles the core functionality of the editor.
- **`monaco-editor`:** Lightweight code editor library.
- **`Prism.js`:** Provides syntax highlighting.
