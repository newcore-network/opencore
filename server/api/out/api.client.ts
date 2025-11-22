import { injectable } from "tsyringe";

@injectable()
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = GetConvar("api_url", "http://localhost:3000");
  }

  setToken(token: string) {
    this.token = token;
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["X-Identifier"] = `${this.token}`;
    }

    return headers;
  }

  async get<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async post<T = any>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async put<T = any>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`PUT ${endpoint} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
