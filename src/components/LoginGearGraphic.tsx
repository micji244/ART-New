export default function LoginGearGraphic({ className = "" }: { className?: string }) {
  return (
    <svg className={`login-gear-graphic ${className}`} viewBox="0 0 200 200" aria-hidden="true">
      <g className="login-gear-rotor">
        {Array.from({ length: 14 }, (_, index) => (
          <rect key={index} className="login-gear-tooth" x="90" y="3" width="20" height="29" rx="3" transform={`rotate(${index * (360 / 14)} 100 100)`} />
        ))}
        <circle className="login-gear-outline" cx="100" cy="100" r="73" />
        <circle className="login-gear-inner" cx="100" cy="100" r="56" />
        {Array.from({ length: 7 }, (_, index) => (
          <path key={index} className="login-gear-spoke" d="M100 48 L100 76" transform={`rotate(${index * (360 / 7)} 100 100)`} />
        ))}
        <circle className="login-gear-hub" cx="100" cy="100" r="26" />
        <circle className="login-gear-hub-core" cx="100" cy="100" r="9" />
      </g>
    </svg>
  );
}
