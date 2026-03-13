import { create } from "zustand";

export const useAgentStore = create((set) => ({
  isSlugValid: true,
  setIsSlugValid: (isValid) => set({ isSlugValid: isValid }),
  errors: {},
  setErrors: (errors) => set({ errors }),
  agentConfig: {
    name: "",
    slug: "",
    description: "",
    llm: {
      provider: "OpenAI",
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 1000,
      api_key: "",
    },
    prompt: {
      system_prompt: "You are a helpful AI assistant.",
      few_shot_examples: [],
      input_variables: [],
    },
    rag: {
      enabled: false,
      vector_db: "Pinecone",
      api_key: "",
      url: "",
      index_name: "",
      embedding_model: "text-embedding-3-small",
      top_k: 3,
      similarity_threshold: 0.7,
      search_type: "dense",
      dense_vector_name: "text-dense",
      sparse_vector_name: "text-sparse",
    },
    output: {
      format: "Plain text",
      max_length: 2000,
      streaming: false,
    },
  },
  
  updateConfig: (section, data) => set((state) => ({
    agentConfig: {
      ...state.agentConfig,
      [section]: { ...state.agentConfig[section], ...data }
    }
  })),

  updateRootConfig: (data) => set((state) => ({
    agentConfig: { ...state.agentConfig, ...data }
  })),

  resetConfig: () => set({
    agentConfig: {
      name: "",
      slug: "",
      description: "",
      llm: {
        provider: "OpenAI",
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 1000,
        api_key: "",
      },
      prompt: {
        system_prompt: "You are a helpful AI assistant.",
        few_shot_examples: [],
        input_variables: [],
      },
      rag: {
        enabled: false,
        vector_db: "Pinecone",
        api_key: "",
        url: "",
        index_name: "",
        embedding_model: "text-embedding-3-small",
        top_k: 3,
        similarity_threshold: 0.7,
      },
      output: {
        format: "Plain text",
        max_length: 2000,
        streaming: false,
      },
    }
  }),

  setConfig: (config) => set({ agentConfig: config })
}));
