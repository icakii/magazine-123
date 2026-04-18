function makeStars(n, seed) {
  let s = seed
  const lcg = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
  return Array.from({ length: n }, () =>
    `${Math.round(lcg() * 1800)}px ${Math.round(lcg() * 2800)}px #fff`
  ).join(",")
}

const S1 = makeStars(700, 1)
const S2 = makeStars(200, 7)
const S3 = makeStars(100, 13)

export default function StarsBackground() {
  return (
    <div className="stars-bg" aria-hidden="true">
      <div className="stars-s" style={{ boxShadow: S1 }} />
      <div className="stars-m" style={{ boxShadow: S2 }} />
      <div className="stars-l" style={{ boxShadow: S3 }} />
    </div>
  )
}
