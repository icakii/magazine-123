"use client"

import { useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "../hooks/useAuth"

export default function EMagazine() {
  const { user } = useAuth()
  const [issues, setIssues] = useState([])
  const [selectedIssueId, setSelectedIssueId] = useState("")
  const [subscription, setSubscription] = useState("free")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Зареждаме списанията от сървъра
    Promise.all([
        api.get('/magazines').catch(() => ({ data: [] })),
        api.get('/subscriptions').catch(() => ({ data: [] }))
    ]).then(([magRes, subRes]) => {
        const fetchedIssues = magRes.data || []
        setIssues(fetchedIssues)
        
        // Автоматично избираме първото списание (най-новото)
        if (fetchedIssues.length > 0) {
            setSelectedIssueId(fetchedIssues[0].id)
        }

        // Проверяваме плана на потребителя
        const plan = subRes.data?.[0]?.plan?.toLowerCase() || 'free'
        setSubscription(plan)
    }).finally(() => setLoading(false))
  }, [])

  // Намираме текущо избраното списание
  const currentIssue = issues.find(i => i.id == selectedIssueId)
  
  // Проверка за достъп
  const hasAccess = !currentIssue?.isLocked || (subscription === 'monthly' || subscription === 'yearly')

  if (loading) return <div className="page" style={{textAlign:"center", padding: 50}}>Loading archive...</div>

  return (
    <div className="page">
      <div style={{textAlign: "center", marginBottom: 30}}>
          <h1 className="headline">MIREN Archive</h1>
          <p className="subhead">Digital Magazine Collection</p>
          
          {/* --- ПАДАЩО МЕНЮ ЗА ИЗБОР --- */}
          {issues.length > 0 ? (
              <div style={{marginTop: 20}}>
                  <select 
                    value={selectedIssueId} 
                    onChange={(e) => setSelectedIssueId(e.target.value)}
                    className="input"
                    style={{
                        padding: "10px 20px", 
                        fontSize: "1.1rem", 
                        borderRadius: 8, 
                        border: "2px solid #e63946", 
                        cursor: "pointer", 
                        fontWeight: "bold"
                    }}
                  >
                      {issues.map(issue => (
                          <option key={issue.id} value={issue.id}>
                              Issue #{issue.issueNumber} — {issue.month} {issue.year} {issue.isLocked ? "(Premium)" : "(Free)"}
                          </option>
                      ))}
                  </select>
              </div>
          ) : (
              <p style={{color: "#888", marginTop: 20}}>No magazines uploaded yet.</p>
          )}
      </div>

      {/* --- СЪДЪРЖАНИЕ НА СПИСАНИЕТО --- */}
      {currentIssue && (
          <div className="card" style={{maxWidth: 1000, margin: "0 auto", padding: 30, minHeight: 600, background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.1)"}}>
              
              {!hasAccess ? (
                  // ЗАКЛЮЧЕН ИЗГЛЕД (LOCKED)
                  <div style={{textAlign: "center", padding: "60px 20px"}}>
                      <div style={{fontSize: "4rem", marginBottom: 15}}>🔒</div>
                      <h2 style={{fontSize: "2rem", marginBottom: 10}}>Premium Content</h2>
                      <p style={{color:"#666", marginBottom: 30, maxWidth: 500, margin: "0 auto 30px auto"}}>
                          This issue is available only for MIREN subscribers. <br/>
                          Support independent journalism to unlock the full archive.
                      </p>
                      
                      {/* Замъглена корица за ефект */}
                      <div style={{filter: "blur(15px)", opacity: 0.6, marginBottom: 30, pointerEvents: "none"}}>
                          <img src={currentIssue.coverUrl} style={{width: 250, borderRadius: 8}} />
                      </div>

                      <a href="/subscriptions" className="btn primary" style={{padding: "15px 30px", fontSize: "1.1rem", textDecoration: "none", display:"inline-block"}}>
                          Unlock Access
                      </a>
                  </div>
              ) : (
                  // ОТКЛЮЧЕН ИЗГЛЕД (UNLOCKED)
                  <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 30}}>
                      
                      {/* HEADER */}
                      <div style={{textAlign:"center", borderBottom: "1px solid #eee", paddingBottom: 20, width: "100%"}}>
                          <h2 style={{margin:0, color: "#1a2b49"}}>Issue #{currentIssue.issueNumber}</h2>
                          <p style={{color:"#e63946", fontWeight: "bold"}}>{currentIssue.month} {currentIssue.year}</p>
                      </div>

                      {/* COVER */}
                      {currentIssue.coverUrl && (
                          <div style={{position: "relative", marginBottom: 20}}>
                              <img 
                                src={currentIssue.coverUrl} 
                                alt="Cover" 
                                style={{maxWidth: "100%", maxHeight: 800, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", borderRadius: 4}} 
                              />
                              <div style={{textAlign:"center", marginTop: 5, fontSize: "0.8rem", color: "#888"}}>Cover</div>
                          </div>
                      )}
                      
                      {/* PAGES LOOP */}
                      {currentIssue.pages && currentIssue.pages.map((pageUrl, idx) => (
                          <div key={idx} style={{width: "100%", textAlign: "center"}}>
                              <img 
                                src={pageUrl} 
                                alt={`Page ${idx+1}`} 
                                loading="lazy"
                                style={{maxWidth: "100%", border: "1px solid #eee", boxShadow: "0 5px 15px rgba(0,0,0,0.05)"}} 
                              />
                              <p style={{fontSize: "0.8rem", color: "#ccc", marginTop: 5}}>- {idx + 1} -</p>
                          </div>
                      ))}
                      
                      <div style={{marginTop: 40, borderTop: "1px solid #eee", paddingTop: 20, width: "100%", textAlign: "center", color: "#888"}}>
                          End of Issue
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  )
}