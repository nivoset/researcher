# LangChain + Azure OpenAI Baseline Project

This is a baseline Node.js project for experimenting with [LangChain-JS](https://js.langchain.com/) and Azure OpenAI.

## Setup

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root with the following content:
   ```env
   AZURE_OPENAI_API_KEY=your-azure-openai-key
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

   Replace the values with your Azure OpenAI credentials and deployment info.

## Usage

Run the baseline script:

```sh
node src/index.js
```

You should see a response from your Azure OpenAI deployment.

---

This setup is ready for further research and experimentation with LangChain and Azure OpenAI models. 