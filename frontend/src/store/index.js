import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export const useAgentStore = create((set) => ({
  isSlugValid: true,
  setIsSlugValid: (isValid) => set({ isSlugValid: isValid }),
  errors: {},
  setErrors: (errors) => set({ errors }),
  isExistingAgent: false,
  setIsExistingAgent: (isExisting) => set({ isExistingAgent: isExisting }),
  agentConfig: {
    id: uuidv4(),
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
      chunk_size: 1000,
      chunk_overlap: 200,
    },
    output: {
      format: "Plain text",
      max_length: 2000,
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
    isExistingAgent: false,
    agentConfig: {
      id: uuidv4(),
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
        chunk_size: 1000,
        chunk_overlap: 200,
      },
      output: {
        format: "Plain text",
        max_length: 2000,
        streaming: false,
      },
    }
  }),

  setConfig: (config) => set({ 
    agentConfig: config,
    isExistingAgent: true 
  })
}));
