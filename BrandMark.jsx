export default function BrandMark({ size = 26 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 25c0-6.2 3.1-10.3 7.5-10.3 4.6 0 6.6 4 10.1 4 1.1 0 2.1-.3 3.1-.9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="7" cy="25" r="2.4" fill="currentColor" />
      <path
        d="m24.2 5.5 1.5 4.4 4.3 1.5-4.3 1.5-1.5 4.3-1.5-4.3-4.4-1.5 4.4-1.5 1.5-4.4Z"
        fill="currentColor"
      />
    </svg>
  );
}
