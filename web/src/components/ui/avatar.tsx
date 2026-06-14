"use client";

import { cn } from "@/lib/utils";
import { photoSrc } from "@/lib/images";

/**
 * Renders a user's avatar image when set, otherwise a colored gradient circle
 * containing the first letter of the nickname. Pure presentation — no API calls.
 *
 * Use `size` to pick a preset, or pass arbitrary classes via `className`.
 */
export function Avatar({
  nickname,
  avatarUrl,
  size = "md",
  className,
  gradient = "from-ocean-500 to-teal-500",
  ring = false,
}: {
  nickname: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  gradient?: string;
  ring?: boolean;
}) {
  const sizeClass = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-xl",
    xl: "w-24 h-24 text-3xl",
  }[size];

  const resolved = photoSrc(avatarUrl);
  const initial = nickname?.[0]?.toUpperCase() || "?";

  const inner = resolved ? (
    <img
      src={resolved}
      alt={`${nickname}'s avatar`}
      className={cn("w-full h-full rounded-full object-cover bg-deep-100 dark:bg-deep-800", className)}
    />
  ) : (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br",
        gradient,
        sizeClass,
        className
      )}
      aria-label={`${nickname}'s avatar`}
      role="img"
    >
      {initial}
    </div>
  );

  if (resolved) {
    return (
      <div className={cn("rounded-full overflow-hidden", sizeClass, ring && "avatar-ring")}>
        {inner}
      </div>
    );
  }

  return ring ? <div className="avatar-ring">{inner}</div> : inner;
}
