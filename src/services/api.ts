import { createSignal } from 'solid-js';

// API Configuration
const API_BASE_URL = 'https://qvamarkets.com/gql_api';

// Global loading state
const [isLoading, setIsLoading] = createSignal(false);
const [apiError, setApiError] = createSignal<string | null>(null);

// Types for API responses
interface ApiResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  extensions?: any;
}

interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

// HTTP Methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Generic API handler
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic HTTP request handler
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    setIsLoading(true);
    setApiError(null);

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle GraphQL errors
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      return result.data || result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setApiError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // GraphQL specific request handler
  async graphql<T>(request: GraphQLRequest): Promise<T> {
    return this.request<T>('POST', '', request);
  }

  // REST API methods
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  async post<T>(endpoint: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', endpoint, data, headers);
  }

  async put<T>(endpoint: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  async patch<T>(endpoint: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, headers);
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, headers);
  }

  // Utility methods
  getLoadingState() {
    return isLoading();
  }

  getErrorState() {
    return apiError();
  }

  clearError() {
    setApiError(null);
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export loading and error states
export { isLoading, apiError };

// Export types
export type { ApiResponse, GraphQLRequest };