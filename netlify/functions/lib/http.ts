export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers });
}

export function err(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
