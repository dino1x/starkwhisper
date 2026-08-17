/**
 * Direct Starknet RPC Provider Client.
 * Queries Starknet node RPC endpoints directly via standard JSON-RPC HTTP requests.
 */

export interface RpcQueryOptions {
  rpcEndpoint: string;
  method: string;
  params: any[];
}

export interface RpcQueryResponse<T = any> {
  result: T;
  latencyMs: number;
}

/**
 * Executes a direct JSON-RPC query against a Starknet node endpoint.
 */
export async function executeOhttpRpcCall<T = any>({
  rpcEndpoint,
  method,
  params,
}: RpcQueryOptions): Promise<RpcQueryResponse<T>> {
  const startTime = Date.now();

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  });

  const res = await fetch(rpcEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`RPC node returned HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`RPC Error (${data.error.code}): ${data.error.message}`);
  }

  return {
    result: data.result,
    latencyMs: Date.now() - startTime,
  };
}
