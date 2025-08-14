"use client";

export default function LoadingDots() {
    return (
    <span className="inline-flex ml-2">
        <span className="dot animate-bounce delay-0">.</span>
        <span className="dot animate-bounce delay-150">.</span>
        <span className="dot animate-bounce delay-300">.</span>
    </span>
    );
}
