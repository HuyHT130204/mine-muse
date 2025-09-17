// Model Manager for rotating between different HuggingFace models

import { CONFIG } from './config';

type MinimalLLM = {
  invoke: (input: string) => Promise<unknown>;
} & Partial<{
  stream: (input: string) => Promise<AsyncIterable<{ content?: unknown }>>;
}>;

export class ModelManager {
  private models: Map<string, MinimalLLM> = new Map();
  private currentModelIndex: number = 0;
  private rotationStrategy: 'alternating' | 'random' = 'alternating';

  constructor() {
    this.rotationStrategy = CONFIG.AI.MODEL_ROTATION.ROTATION_STRATEGY;
    this.initializeModels();
  }

  private initializeModels(): void {
    // No longer initializing HF models here; OpenRouter is preferred.
    this.models.clear();
  }

  getCurrentModel(): MinimalLLM | undefined {
    if (this.models.size === 0) {
      return undefined;
    }

    const modelNames = Array.from(this.models.keys());
    const currentModelName = modelNames[this.currentModelIndex];
    return this.models.get(currentModelName);
  }

  getCurrentModelName(): string | undefined {
    if (this.models.size === 0) {
      return undefined;
    }

    const modelNames = Array.from(this.models.keys());
    return modelNames[this.currentModelIndex];
  }

  rotateModel(): MinimalLLM | undefined {
    if (this.models.size === 0) {
      return undefined;
    }

    if (this.rotationStrategy === 'random') {
      const modelNames = Array.from(this.models.keys());
      const randomIndex = Math.floor(Math.random() * modelNames.length);
      this.currentModelIndex = randomIndex;
    } else {
      // Alternating strategy
      this.currentModelIndex = (this.currentModelIndex + 1) % this.models.size;
    }

    const newModel = this.getCurrentModel();
    const modelName = this.getCurrentModelName();
    console.log(`🔄 Rotated to model: ${modelName}`);
    
    return newModel;
  }

  getModelByName(modelName: string): MinimalLLM | undefined {
    return this.models.get(modelName);
  }

  getAllModels(): { name: string; model: MinimalLLM }[] {
    return Array.from(this.models.entries()).map(([name, model]) => ({
      name,
      model
    }));
  }

  getModelCount(): number {
    return this.models.size;
  }

  isModelAvailable(modelName: string): boolean {
    return this.models.has(modelName);
  }

  // Get a model for a specific task (can be used for load balancing)
  getModelForTask(): MinimalLLM | undefined {
    if (this.models.size === 0) {
      return undefined;
    }

    // For now, just rotate normally, but this can be extended for task-specific model selection
    return this.getCurrentModel();
  }

  // Force rotation to a specific model
  setModel(modelName: string): boolean {
    if (!this.models.has(modelName)) {
      console.error(`Model ${modelName} not available`);
      return false;
    }

    const modelNames = Array.from(this.models.keys());
    const index = modelNames.indexOf(modelName);
    if (index !== -1) {
      this.currentModelIndex = index;
      console.log(`🎯 Set active model to: ${modelName}`);
      return true;
    }

    return false;
  }

  // Get model statistics
  getStats(): {
    totalModels: number;
    currentModel: string | undefined;
    availableModels: string[];
    rotationStrategy: string;
  } {
    return {
      totalModels: this.models.size,
      currentModel: this.getCurrentModelName(),
      availableModels: Array.from(this.models.keys()),
      rotationStrategy: this.rotationStrategy
    };
  }
}

// Singleton instance
export const modelManager = new ModelManager();
