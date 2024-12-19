![6051164](https://github.com/user-attachments/assets/1cfa2b1c-c744-4cbc-a7e7-b9d56c0c4ee6)

### TODO

- Support autocomplete outside of localhost
- Allows user to select LLM
- Code selection for autocomplete
- RAG for code in directory

# Code Editor with Autocomplete

![Screenshot 2024-12-19 at 13 31 19](https://github.com/user-attachments/assets/35034a58-96a3-4cb7-930a-b2c19dd93a54)

This project implements a simple code editor with syntax highlighting and autocomplete functionality.

## Features

- **Code Editing:** Supports editing Python code with line numbers.
- **Syntax Highlighting:** Uses `Prism.js` with the "Tomorrow" theme.
- **Autocomplete:** Fetches code suggestions from an Ollama server based on the provided code.
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
- **`react-simple-code-editor`:** Lightweight code editor library.
- **`Prism.js`:** Provides syntax highlighting.

## API

This editor fetches autocomplete suggestions from an API endpoint:
- URL: `http://localhost:11434/api/generate`
- Method: `POST`
- Payload:
  ```json
  {
    "model": "qwen2.5-coder:7b",
    "prompt": "<your_code_with_prompts>",
    "system": "<your_system_instructions>"
  }
  ```

## Customization

- **Highlighting:** Update `Prism.js` language definitions to add more languages.
- **Styling:** Modify the `prism-tomorrow.css` or provide a custom CSS theme.
- **Server:** Replace the autocomplete API endpoint with your custom implementation.

## Dependencies

- React
- `react-simple-code-editor`
- `prismjs`
- `prismjs/themes/prism-tomorrow.css`
