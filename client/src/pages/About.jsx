import { t } from "../lib/i18n"

const staffMembers = [
  { name: "John Doe", title: "Founder & CEO", image: "/thoughtful-man.png" },
  { name: "Jane Smith", title: "Creative Director", image: "/portrait-woman.png" },
  { name: "Mike Johnson", title: "Tech Lead", image: "/portrait-man-tech.jpg" },
  { name: "Sarah Wilson", title: "Content Manager", image: "/portrait-woman-content.jpg" },
  { name: "Alex Brown", title: "Designer", image: "/portrait-designer.jpg" },
  { name: "Emma Davis", title: "Marketing", image: "/portrait-woman-marketing.jpg" },
  { name: "Chris Lee", title: "Developer", image: "/portrait-developer.jpg" },
  { name: "Lisa Anderson", title: "Community Lead", image: "/portrait-woman-community.jpg" },
]

export default function About() {
  const text =
    "MIREN is a cutting-edge digital magazine platform dedicated to bringing fresh, innovative content to readers worldwide. Our mission is to blend creativity with technology, delivering exceptional storytelling in every page."

  return (
    <div className="page">
      <h2 className="headline">{t("about")}</h2>

      {/* Drop cap text */}
      <div style={{ marginBottom: 32, lineHeight: 1.8 }}>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--text)",
            textAlign: "justify",
          }}
        >
          <span
            style={{
              float: "left",
              fontSize: "3em",
              lineHeight: "0.8",
              paddingRight: "8px",
              fontWeight: "bold",
              color: "var(--primary)",
            }}
          >
            {text.charAt(0)}
          </span>
          {text.substring(1)}
        </p>
      </div>

      {/* Staff cards - 2 per row */}
      <div className="grid">
        {staffMembers.map((staff, idx) => (
          <div key={idx} className="col-6">
            <div className="card">
              <img
                src={staff.image || "/placeholder.svg"}
                alt={staff.name}
                style={{ width: "100%", borderRadius: 8, marginBottom: 12, height: 200, objectFit: "cover" }}
              />
              <h4 style={{ marginBottom: 4 }}>{staff.name}</h4>
              <p className="text-muted">{staff.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* More text */}
      <div style={{ marginTop: 32, marginBottom: 32, textAlign: "center" }}>
        <p style={{ fontSize: "1rem", color: "var(--text-muted)", lineHeight: 1.8 }}>
          Founded in 2024, MIREN has grown to become a beacon of digital journalism and creative excellence. We believe
          in empowering voices, celebrating diverse stories, and pushing the boundaries of what digital media can
          achieve.
        </p>
      </div>

      {/* Large hero image */}
      <div style={{ marginBottom: 32 }}>
        <img
          src="/collaborative-teamwork.png"
          alt="MIREN Team"
          style={{ width: "100%", borderRadius: 12, marginBottom: 16 }}
        />
        <p style={{ textAlign: "right", fontStyle: "italic", color: "var(--text-muted)" }}>- MIREN Team</p>
      </div>
    </div>
  )
}
