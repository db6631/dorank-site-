import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiUrl = process.env.DORANK_API_URL;
  if (!apiUrl) return NextResponse.json({ ok: true });

  const res = await fetch(`${apiUrl}/favorites/${id}`, {
    method: "DELETE",
    headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
  });
  if (!res.ok) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json(await res.json());
}
