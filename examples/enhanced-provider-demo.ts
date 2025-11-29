import { EnhancedProviderSystem, type EnhancedProviderSystemConfig } from '../src/providers/enhanced-provider-system';
import { AgentType, TaskType, LoadBalancingStrategy, ModelQuality, ModelType } from '../src/types';
import { Logger } from '../src/utils/logger';

const logger = new Logger().withContext({ component: 'EnhancedProviderDemo' });

async function demonstrateEnhancedProviderSystem() {
  console.log('🚀 Enhanced Provider System Demo\n');

  // Configuration for the enhanced provider system
  const config: EnhancedProviderSystemConfig = {
    providers: [
      {
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
        model: 'gpt-4-turbo-preview',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 30000,
        rateLimit: {
          requestsPerSecond: 10,
          tokensPerSecond: 50000,
          burstLimit: 50,
          retryAfter: 5000
        },
        // Enhanced configuration
        customBaseUrls: [
          'https://api.openai.com/v1',
          'https://api.openai-alt.com/v1' // Backup endpoint
        ],
        models: {
          chatModels: [
            {
              id: 'gpt-4-turbo-preview',
              name: 'GPT-4 Turbo Preview',
              type: ModelType.CHAT,
              capabilities: ['streaming', 'function_calling', 'json_mode'],
              maxTokens: 128000,
              inputLimit: 128000,
              outputLimit: 4000,
              costPerToken: 0.00001,
              costPerRequest: 0.03,
              averageLatency: 2000,
              quality: ModelQuality.PREMIUM,
              provider: 'openai'
            },
            {
              id: 'gpt-3.5-turbo',
              name: 'GPT-3.5 Turbo',
              type: ModelType.CHAT,
              capabilities: ['streaming', 'function_calling'],
              maxTokens: 16384,
              inputLimit: 16384,
              outputLimit: 4000,
              costPerToken: 0.0000015,
              costPerRequest: 0.002,
              averageLatency: 800,
              quality: ModelQuality.STANDARD,
              provider: 'openai'
            }
          ],
          visionModels: [
            {
              id: 'gpt-4-vision-preview',
              name: 'GPT-4 Vision Preview',
              type: ModelType.VISION,
              capabilities: ['vision', 'streaming'],
              maxTokens: 128000,
              inputLimit: 128000,
              outputLimit: 4000,
              costPerToken: 0.00001,
              costPerRequest: 0.03,
              averageLatency: 3000,
              quality: ModelQuality.PREMIUM,
              provider: 'openai'
            }
          ],
          embeddingModels: [],
          audioModels: [],
          imageModels: [],
          defaultChatModel: 'gpt-4-turbo-preview',
          defaultVisionModel: 'gpt-4-vision-preview',
          defaultEmbeddingModel: 'text-embedding-3-small',
          defaultAudioModel: 'whisper-1',
          defaultImageModel: 'dall-e-3'
        },
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retryAttempts: 3,
          endpoints: ['/models', '/chat/completions']
        },
        costOptimization: {
          enabled: true,
          budgetLimits: {
            daily: 100,
            weekly: 500,
            monthly: 1500,
            perRequest: 1
          },
          costThresholds: {
            warningPercentage: 0.7,
            criticalPercentage: 0.9,
            autoFailoverPercentage: 0.95
          },
          modelRanking: {
            weightPerformance: 0.4,
            weightCost: 0.3,
            weightLatency: 0.2,
            weightQuality: 0.1
          },
          autoOptimize: true
        },
        loadBalancing: {
          strategy: LoadBalancingStrategy.ADAPTIVE,
          failoverEnabled: true,
          circuitBreaker: {
            failureThreshold: 5,
            recoveryTimeout: 60000,
            halfOpenMaxCalls: 3,
            monitoringPeriod: 120000
          }
        }
      }
    ],
    pools: [
      {
        id: 'primary-pool',
        name: 'Primary Provider Pool',
        providerIds: ['gpt-4-turbo-preview'],
        loadBalancingStrategy: LoadBalancingStrategy.ADAPTIVE,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 60000
        },
        healthCheck: {
          enabled: true,
          interval: 30000
        }
      },
      {
        id: 'backup-pool',
        name: 'Backup Provider Pool',
        providerIds: ['gpt-3.5-turbo'],
        loadBalancingStrategy: LoadBalancingStrategy.LEAST_RESPONSE_TIME,
        circuitBreaker: {
          failureThreshold: 3,
          recoveryTimeout: 30000
        },
        healthCheck: {
          enabled: true,
          interval: 30000
        }
      }
    ],
    modelBindings: [
      {
        agentType: AgentType.QUEEN,
        taskType: TaskType.STRATEGIC_PLANNING,
        preferredModels: ['gpt-4-turbo-preview'],
        fallbackModels: ['gpt-3.5-turbo'],
        autoSelection: true,
        performanceThreshold: 0.95,
        costThreshold: 0.05
      },
      {
        agentType: AgentType.WORKER,
        taskType: TaskType.TACTICAL_EXECUTION,
        preferredModels: ['gpt-3.5-turbo'],
        fallbackModels: ['gpt-4-turbo-preview'],
        autoSelection: true,
        performanceThreshold: 0.85,
        costThreshold: 0.02
      },
      {
        agentType: AgentType.SPECIALIST,
        taskType: TaskType.DATA_ANALYSIS,
        preferredModels: ['gpt-4-turbo-preview'],
        fallbackModels: ['gpt-4-vision-preview'],
        autoSelection: true,
        performanceThreshold: 0.90,
        costThreshold: 0.04
      }
    ],
    analytics: {
      enabled: true,
      retentionPeriod: 30,
      snapshotInterval: 60,
      aggregationInterval: 300,
      alerting: {
        enabled: true,
        thresholds: {
          errorRate: 0.1,
          latency: 5000,
          cost: 100,
          throughput: 100,
          availability: 0.95,
          resourceUsage: 0.8
        },
        notificationChannels: [
          {
            type: 'console',
            config: {},
            enabled: true,
            filters: ['error', 'warning']
          }
        ]
      },
      patterns: {
        enabled: true,
        minPatternFrequency: 3,
        patternConfidence: 0.7
      },
      optimization: {
        enabled: true,
        analysisInterval: 600,
        recommendationThreshold: 0.8
      }
    },
    features: {
      autoOptimization: true,
      predictiveScaling: false,
      costOptimization: true,
      performanceMonitoring: true,
      healthChecking: true,
      loadBalancing: true,
      circuitBreakers: true
    }
  };

  // Initialize the enhanced provider system
  const providerSystem = new EnhancedProviderSystem(config);

  try {
    // Initialize the system
    await providerSystem.initialize();
    console.log('✅ Enhanced Provider System initialized successfully!\n');

    // Register additional models if needed
    const visionModel = {
      id: 'gpt-4-vision-preview',
      name: 'GPT-4 Vision Preview',
      type: ModelType.VISION,
      capabilities: ['vision', 'streaming'],
      maxTokens: 128000,
      inputLimit: 128000,
      outputLimit: 4000,
      costPerToken: 0.00001,
      costPerRequest: 0.03,
      averageLatency: 3000,
      quality: ModelQuality.PREMIUM,
      provider: 'openai'
    };

    await providerSystem.registerModel(visionModel);
    console.log('📊 Vision model registered\n');

    // Demo 1: Execute a request with model binding
    console.log('🎯 Demo 1: Strategic Planning (Queen Agent)');
    console.log('--------------------------------------------');

    const strategicRequest = {
      id: 'strategic-1',
      messages: [
        { role: 'system', content: 'You are a strategic planning AI assistant.' },
        { role: 'user', content: 'Develop a 3-year strategic plan for expanding into European markets.' }
      ],
      temperature: 0.7,
      maxTokens: 2000,
      metadata: {
        priority: 3,
        qualityRequirement: ModelQuality.PREMIUM,
        latencyLimit: 10000
      }
    };

    try {
      const strategicResponse = await providerSystem.executeRequest(
        'primary-pool',
        strategicRequest,
        AgentType.QUEEN,
        TaskType.STRATEGIC_PLANNING
      );

      console.log('✅ Strategic planning completed');
      console.log(`📝 Model used: ${strategicResponse.model}`);
      console.log(`💰 Estimated cost: $${(strategicResponse.usage.totalTokens * 0.00001).toFixed(4)}`);
      console.log(`📊 Tokens used: ${strategicResponse.usage.totalTokens}`);
      console.log(`⚡ Response preview: ${strategicResponse.content.substring(0, 100)}...\n`);
    } catch (error) {
      console.error('❌ Strategic planning failed:', error);
    }

    // Demo 2: Execute a tactical task (Worker Agent)
    console.log('🔧 Demo 2: Tactical Execution (Worker Agent)');
    console.log('---------------------------------------------');

    const tacticalRequest = {
      id: 'tactical-1',
      messages: [
        { role: 'system', content: 'You are a tactical execution AI assistant.' },
        { role: 'user', content: 'Generate a detailed implementation plan for the Q1 marketing campaign.' }
      ],
      temperature: 0.5,
      maxTokens: 1500,
      metadata: {
        priority: 2,
        qualityRequirement: ModelQuality.STANDARD,
        latencyLimit: 5000
      }
    };

    try {
      const tacticalResponse = await providerSystem.executeRequest(
        'backup-pool',
        tacticalRequest,
        AgentType.WORKER,
        TaskType.TACTICAL_EXECUTION
      );

      console.log('✅ Tactical execution completed');
      console.log(`📝 Model used: ${tacticalResponse.model}`);
      console.log(`💰 Estimated cost: $${(tacticalResponse.usage.totalTokens * 0.0000015).toFixed(4)}`);
      console.log(`📊 Tokens used: ${tacticalResponse.usage.totalTokens}`);
      console.log(`⚡ Response preview: ${tacticalResponse.content.substring(0, 100)}...\n`);
    } catch (error) {
      console.error('❌ Tactical execution failed:', error);
    }

    // Demo 3: Streaming request
    console.log('🌊 Demo 3: Streaming Request (Specialist Agent)');
    console.log('--------------------------------------------------');

    const streamingRequest = {
      id: 'streaming-1',
      messages: [
        { role: 'system', content: 'You are a data analysis specialist AI assistant.' },
        { role: 'user', content: 'Analyze the following sales data and provide insights: [data would be here]' }
      ],
      temperature: 0.3,
      maxTokens: 2500,
      stream: true,
      metadata: {
        priority: 2,
        qualityRequirement: ModelQuality.PREMIUM,
        latencyLimit: 8000
      }
    };

    let streamingContent = '';
    try {
      console.log('📡 Starting streaming request...');

      const streamingResponse = await providerSystem.executeStreamingRequest(
        'primary-pool',
        streamingRequest,
        (chunk: string) => {
          process.stdout.write(chunk);
          streamingContent += chunk;
        },
        AgentType.SPECIALIST,
        TaskType.DATA_ANALYSIS
      );

      console.log('\n✅ Streaming request completed');
      console.log(`📝 Model used: ${streamingResponse.model}`);
      console.log(`💰 Estimated cost: $${(streamingResponse.usage.totalTokens * 0.00001).toFixed(4)}`);
      console.log(`📊 Total tokens: ${streamingResponse.usage.totalTokens}\n`);
    } catch (error) {
      console.error('❌ Streaming request failed:', error);
    }

    // Demo 4: System health and metrics
    console.log('🏥 Demo 4: System Health and Metrics');
    console.log('------------------------------------');

    const systemHealth = providerSystem.getSystemHealth();
    console.log(`📊 System Status: ${systemHealth.status}`);
    console.log(`🏥 Healthy Providers: ${systemHealth.providers.size}`);
    console.log(`🚨 Active Alerts: ${systemHealth.alerts}`);
    console.log(`💡 Recommendations: ${systemHealth.recommendations}`);

    const systemMetrics = providerSystem.getSystemMetrics();
    console.log('\n📈 System Metrics:');
    console.log(`🔌 Total Providers: ${systemMetrics.totalProviders}`);
    console.log(`💚 Healthy Providers: ${systemMetrics.healthyProviders}`);
    console.log(`📊 Total Requests: ${systemMetrics.totalRequests}`);
    console.log(`✅ Success Rate: ${(systemMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`⚡ Average Latency: ${systemMetrics.averageLatency.toFixed(0)}ms`);
    console.log(`💰 Total Cost: $${systemMetrics.totalCost.toFixed(2)}`);
    console.log(`⏰ Uptime: ${Math.floor((Date.now() - systemMetrics.uptime) / 1000 / 60)} minutes\n`);

    // Demo 5: Get available models by agent type
    console.log('🤖 Demo 5: Available Models by Agent Type');
    console.log('------------------------------------------');

    const queenModels = providerSystem.getAvailableModels(AgentType.QUEEN, TaskType.STRATEGIC_PLANNING);
    console.log(`👑 Queen Agent Models: ${queenModels.map(m => m.name).join(', ')}`);

    const workerModels = providerSystem.getAvailableModels(AgentType.WORKER, TaskType.TACTICAL_EXECUTION);
    console.log(`👷 Worker Agent Models: ${workerModels.map(m => m.name).join(', ')}`);

    const specialistModels = providerSystem.getAvailableModels(AgentType.SPECIALIST, TaskType.DATA_ANALYSIS);
    console.log(`🎓 Specialist Agent Models: ${specialistModels.map(m => m.name).join(', ')}\n`);

    // Demo 6: System optimization
    console.log('⚡ Demo 6: System Optimization');
    console.log('------------------------------');

    if (config.features.autoOptimization) {
      console.log('🔧 Running system optimization...');
      try {
        const optimizations = await providerSystem.optimizeSystem();
        console.log(`✅ Optimization completed - ${optimizations.length} recommendations generated`);

        if (optimizations.length > 0) {
          console.log('💡 Top recommendations:');
          optimizations.slice(0, 3).forEach((opt, index) => {
            console.log(`   ${index + 1}. ${opt.description} (${opt.priority})`);
          });
        }
      } catch (error) {
        console.error('❌ Optimization failed:', error);
      }
    } else {
      console.log('ℹ️  Auto-optimization is disabled');
    }

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Clean shutdown
    console.log('\n🛑 Shutting down Enhanced Provider System...');
    await providerSystem.shutdown();
    console.log('✅ Shutdown complete');
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedProviderSystem().catch(console.error);
}

export { demonstrateEnhancedProviderSystem };