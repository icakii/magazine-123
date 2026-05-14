export function SubNamePill({ pfp_url, display_name, plan, size = "sm", onClick, style = {} }) {
  const isMonthly = plan === "monthly"
  const isYearly  = plan === "yearly"
  const emoji = isYearly ? "👑" : isMonthly ? "⭐" : ""

  const pillBg = isYearly
    ? "rgba(245,158,11,0.16)"
    : isMonthly
    ? "rgba(59,130,246,0.15)"
    : "rgba(255,255,255,0.06)"

  const pillBorder = isYearly
    ? "rgba(245,158,11,0.4)"
    : isMonthly
    ? "rgba(59,130,246,0.35)"
    : "rgba(255,255,255,0.1)"

  const avatarSize = size === "lg" ? 30 : size === "md" ? 26 : 22
  const fontSize   = size === "lg" ? "0.9rem" : size === "md" ? "0.84rem" : "0.78rem"
  const initials   = (display_name || "?")[0].toUpperCase()

  const Tag = onClick ? "button" : "span"
  const extraProps = onClick
    ? { type: "button", onClick }
    : {}

  return (
    <Tag
      {...extraProps}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px 3px 3px",
        borderRadius: 999,
        background: pillBg,
        border: `1px solid ${pillBorder}`,
        fontWeight: 700,
        fontSize,
        color: "var(--text)",
        cursor: onClick ? "pointer" : "default",
        background: pillBg,
        textDecoration: "none",
        lineHeight: 1,
        ...style,
      }}
    >
      {pfp_url ? (
        <img
          src={pfp_url}
          alt=""
          style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }}
        />
      ) : (
        <span style={{
          width: avatarSize, height: avatarSize, borderRadius: "50%",
          background: isYearly ? "rgba(245,158,11,0.35)" : isMonthly ? "rgba(59,130,246,0.35)" : "rgba(196,106,74,0.4)",
          color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.72rem", fontWeight: 800, flexShrink: 0,
        }}>
          {initials}
        </span>
      )}
      <span>{display_name || "User"}</span>
      {emoji && <span>{emoji}</span>}
    </Tag>
  )
}
