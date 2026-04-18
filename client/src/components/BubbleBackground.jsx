export default function BubbleBackground() {
  return (
    <div className="bubble-bg" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="bubble-item">
          <span /><span /><span /><span /><span />
        </div>
      ))}
    </div>
  )
}
