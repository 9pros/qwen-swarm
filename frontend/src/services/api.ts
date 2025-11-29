import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse, QueryOptions } from '@/types';

class ApiService {
  private client: AxiosInstance;
  private baseURL = 'http://localhost:3000/api/v1';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    options?: QueryOptions
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...options,
      });

      return {
        data: response.data,
        requestId: response.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || error.message,
        requestId: error.response?.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Agent endpoints
  async getAgents(options?: QueryOptions) {
    return this.request('GET', '/agents', undefined, options);
  }

  async getAgent(id: string, options?: QueryOptions) {
    return this.request('GET', `/agents/${id}`, undefined, options);
  }

  async createAgent(agentData: any, options?: QueryOptions) {
    return this.request('POST', '/agents', agentData, options);
  }

  async updateAgent(id: string, agentData: any, options?: QueryOptions) {
    return this.request('PUT', `/agents/${id}`, agentData, options);
  }

  async deleteAgent(id: string, options?: QueryOptions) {
    return this.request('DELETE', `/agents/${id}`, undefined, options);
  }

  async pauseAgent(id: string, options?: QueryOptions) {
    return this.request('POST', `/agents/${id}/pause`, undefined, options);
  }

  async resumeAgent(id: string, options?: QueryOptions) {
    return this.request('POST', `/agents/${id}/resume`, undefined, options);
  }

  async restartAgent(id: string, options?: QueryOptions) {
    return this.request('POST', `/agents/${id}/restart`, undefined, options);
  }

  async getAgentMetrics(id: string, options?: QueryOptions) {
    return this.request('GET', `/agents/${id}/metrics`, undefined, options);
  }

  async getAgentLogs(id: string, options?: QueryOptions) {
    return this.request('GET', `/agents/${id}/logs`, undefined, options);
  }

  // Task endpoints
  async getTasks(options?: QueryOptions) {
    return this.request('GET', '/tasks', undefined, options);
  }

  async getTask(id: string, options?: QueryOptions) {
    return this.request('GET', `/tasks/${id}`, undefined, options);
  }

  async createTask(taskData: any, options?: QueryOptions) {
    return this.request('POST', '/tasks', taskData, options);
  }

  async updateTask(id: string, taskData: any, options?: QueryOptions) {
    return this.request('PUT', `/tasks/${id}`, taskData, options);
  }

  async deleteTask(id: string, options?: QueryOptions) {
    return this.request('DELETE', `/tasks/${id}`, undefined, options);
  }

  async cancelTask(id: string, options?: QueryOptions) {
    return this.request('POST', `/tasks/${id}/cancel`, undefined, options);
  }

  async retryTask(id: string, options?: QueryOptions) {
    return this.request('POST', `/tasks/${id}/retry`, undefined, options);
  }

  async assignTask(taskId: string, agentId: string, options?: QueryOptions) {
    return this.request('POST', `/tasks/${taskId}/assign`, { agentId }, options);
  }

  async getTaskQueue(options?: QueryOptions) {
    return this.request('GET', '/tasks/queue', undefined, options);
  }

  async getTaskHistory(options?: QueryOptions) {
    return this.request('GET', '/tasks/history', undefined, options);
  }

  // Provider endpoints
  async getProviders(options?: QueryOptions) {
    return this.request('GET', '/providers', undefined, options);
  }

  async getProvider(id: string, options?: QueryOptions) {
    return this.request('GET', `/providers/${id}`, undefined, options);
  }

  async createProvider(providerData: any, options?: QueryOptions) {
    return this.request('POST', '/providers', providerData, options);
  }

  async updateProvider(id: string, providerData: any, options?: QueryOptions) {
    return this.request('PUT', `/providers/${id}`, providerData, options);
  }

  async deleteProvider(id: string, options?: QueryOptions) {
    return this.request('DELETE', `/providers/${id}`, undefined, options);
  }

  async testProvider(id: string, options?: QueryOptions) {
    return this.request('POST', `/providers/${id}/test`, undefined, options);
  }

  async getProviderMetrics(options?: QueryOptions) {
    return this.request('GET', '/providers/metrics', undefined, options);
  }

  // System endpoints
  async getSystemHealth(options?: QueryOptions) {
    return this.request('GET', '/system/health', undefined, options);
  }

  async getSystemMetrics(options?: QueryOptions) {
    return this.request('GET', '/system/metrics', undefined, options);
  }

  async getSystemStatus(options?: QueryOptions) {
    return this.request('GET', '/system/status', undefined, options);
  }

  async getSystemLogs(options?: QueryOptions) {
    return this.request('GET', '/system/logs', undefined, options);
  }

  async getSystemConfig(options?: QueryOptions) {
    return this.request('GET', '/system/config', undefined, options);
  }

  async updateSystemConfig(config: any, options?: QueryOptions) {
    return this.request('PUT', '/system/config', config, options);
  }

  async getSystemVersion(options?: QueryOptions) {
    return this.request('GET', '/system/version', undefined, options);
  }

  // Consensus endpoints
  async getConsensusProposals(options?: QueryOptions) {
    return this.request('GET', '/consensus/proposals', undefined, options);
  }

  async getConsensusProposal(id: string, options?: QueryOptions) {
    return this.request('GET', `/consensus/proposals/${id}`, undefined, options);
  }

  async createConsensusProposal(proposalData: any, options?: QueryOptions) {
    return this.request('POST', '/consensus/proposals', proposalData, options);
  }

  async voteOnProposal(proposalId: string, vote: any, options?: QueryOptions) {
    return this.request('POST', `/consensus/proposals/${proposalId}/vote`, vote, options);
  }

  async getConsensusMetrics(options?: QueryOptions) {
    return this.request('GET', '/consensus/metrics', undefined, options);
  }

  // Communication endpoints
  async getMessages(options?: QueryOptions) {
    return this.request('GET', '/communication/messages', undefined, options);
  }

  async sendMessage(messageData: any, options?: QueryOptions) {
    return this.request('POST', '/communication/messages', messageData, options);
  }

  async getCommunicationMetrics(options?: QueryOptions) {
    return this.request('GET', '/communication/metrics', undefined, options);
  }

  async getAgentCommunication(agentId: string, options?: QueryOptions) {
    return this.request('GET', `/communication/agents/${agentId}`, undefined, options);
  }

  // Authentication endpoints (if available)
  async login(credentials: { email: string; password: string }) {
    return this.request('POST', '/auth/login', credentials);
  }

  async logout() {
    return this.request('POST', '/auth/logout');
  }

  async refreshToken() {
    return this.request('POST', '/auth/refresh');
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }
}

export const apiService = new ApiService();
export default apiService;