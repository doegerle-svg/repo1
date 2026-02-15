"use client";

interface BitcoinAmountProps {
  btc: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function BitcoinAmount({ btc, size = "md", showIcon = true }: BitcoinAmountProps) {
  const formatted = btc.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-3xl",
  };

  return (
    <span className={`font-mono font-bold ${sizeClasses[size]} text-bitcoin`}>
      {showIcon && (
        <span className="mr-1 text-bitcoin/80">₿</span>
      )}
      {formatted}
    </span>
  );
}
