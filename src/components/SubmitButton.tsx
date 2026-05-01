"use client";

export function SubmitButton({
  children,
  pending,
  pendingText = "処理中...",
}: {
  children: React.ReactNode;
  pending: boolean;
  pendingText?: string;
}) {
  return (
    <button className="primary" disabled={pending} type="submit">
      {pending ? pendingText : children}
    </button>
  );
}
