"use client";

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button className="primary" disabled={pending} type="submit">
      {pending ? "生成中..." : children}
    </button>
  );
}
